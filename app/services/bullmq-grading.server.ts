import { Queue, QueueEvents, Worker } from 'bullmq';
import { bullmqRedis } from '@/lib/redis';
import logger from '@/utils/logger';
import { processGradingResult } from './grading-engine.server';
import { updateGradingSessionProgress } from './grading-session.server';

export interface GradingJob {
  resultId: string;
  userId: string;
  sessionId: string;
  userLanguage?: 'zh' | 'en';
}

const QUEUE_NAME = 'grading';
const BULLMQ_STATE_KEY = '__grading_bullmq_state__';

type BullMQState = {
  queue?: Queue<GradingJob>;
  worker?: Worker<GradingJob>;
  events?: QueueEvents;
  initializationError: Error | null;
  initializationPromise?: Promise<void>;
  disposePromise?: Promise<void>;
};

type GlobalWithBullMQState = typeof globalThis & {
  [BULLMQ_STATE_KEY]?: BullMQState;
};

const globalBullMQState = globalThis as GlobalWithBullMQState;

function getBullMQState(): BullMQState {
  if (!globalBullMQState[BULLMQ_STATE_KEY]) {
    globalBullMQState[BULLMQ_STATE_KEY] = {
      queue: undefined,
      worker: undefined,
      events: undefined,
      initializationError: null,
      initializationPromise: undefined,
      disposePromise: undefined,
    };
  }

  return globalBullMQState[BULLMQ_STATE_KEY]!;
}

const state = getBullMQState();

async function closeServicesInternal(): Promise<void> {
  logger.info('🛑 [BullMQ] Closing worker and queue...');
  const worker = state.worker;
  const queue = state.queue;
  const events = state.events;

  state.worker = undefined;
  state.queue = undefined;
  state.events = undefined;

  const tasks: Promise<unknown>[] = [];

  if (worker) {
    tasks.push(worker.close().catch((error) => logger.error('[BullMQ] Error closing worker:', error)));
  }

  if (queue) {
    tasks.push(queue.close().catch((error) => logger.error('[BullMQ] Error closing queue:', error)));
  }

  if (events) {
    tasks.push(
      events.close().catch((error) => logger.error('[BullMQ] Error closing queue events:', error))
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  state.initializationError = null;
  logger.info('✅ [BullMQ] Services closed successfully');
}

async function initializeBullMQ(): Promise<void> {
  if (state.queue && state.worker && state.events) {
    return;
  }

  if (state.initializationPromise) {
    await state.initializationPromise;
    return;
  }

  state.initializationPromise = (async () => {
    if (state.disposePromise) {
      try {
        await state.disposePromise;
      } catch (error) {
        logger.warn('[BullMQ] Previous dispose encountered an error:', error);
      } finally {
        state.disposePromise = undefined;
      }
    }

    state.initializationError = null;

    try {
      logger.info('[BullMQ] Initializing grading queue...');
      const queue = new Queue<GradingJob>(QUEUE_NAME, {
        connection: bullmqRedis,
        defaultJobOptions: {
          attempts: 999, // Unlimited attempts
          backoff: {
            type: 'exponential',
            delay: 15000, // Start with 15s, then 30s, 60s...
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
      state.queue = queue;

      logger.info('[BullMQ] Initializing grading worker...');
      const worker = new Worker<GradingJob>(
        QUEUE_NAME,
        async (job) => {
          const { resultId, userId, sessionId, userLanguage } = job.data;

          logger.info(
            `🏃 [BullMQ] Processing job ${job.id} for result ${resultId} (attempt ${job.attemptsMade + 1})`
          );

          try {
            const result = await processGradingResult(resultId, userId, sessionId, userLanguage || 'zh');

            if (!result.success) {
              throw new Error(result.error || 'Grading failed');
            }

            await updateGradingSessionProgress(sessionId, userId);

            logger.info(`✅ [BullMQ] Completed job ${job.id} for result ${resultId}`);
            return result;
          } catch (error) {
            logger.error(`❌ [BullMQ] Failed job ${job.id} (attempt ${job.attemptsMade + 1}):`, error);

            const errorMessage = error instanceof Error ? error.message : String(error);

            // Always throw to trigger exponential backoff retry
            logger.warn(`⚠️ [BullMQ] Job failed, will retry with backoff: ${errorMessage}`);
            throw error;
          }
        },
        {
          connection: bullmqRedis,
          concurrency: 3,
        }
      );
      state.worker = worker;

      const events = new QueueEvents(QUEUE_NAME, { connection: bullmqRedis });
      events.on('completed', ({ jobId }) => {
        logger.info(`🎉 [BullMQ] Job ${jobId} completed`);
      });

      events.on('failed', ({ jobId, failedReason }) => {
        logger.error(`💥 [BullMQ] Job ${jobId} failed: ${failedReason}`);
      });

      events.on('stalled', ({ jobId }) => {
        logger.warn(`⚠️ [BullMQ] Job ${jobId} stalled (worker might have died)`);
      });

      events.on('error', (err) => {
        logger.error('💥 [BullMQ] Queue events error:', err);
      });

      state.events = events;

      logger.info('[BullMQ] ✅ Grading queue and worker initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[BullMQ] ❌ Failed to initialize grading services:', err);
      state.initializationError = err;
      state.queue = undefined;
      state.worker = undefined;
      state.events = undefined;
    } finally {
      state.initializationPromise = undefined;
    }
  })();

  await state.initializationPromise;
}

await initializeBullMQ();

export async function addGradingJobs(jobs: GradingJob[]): Promise<{
  success: boolean;
  addedCount: number;
  error?: string;
}> {
  const queue = state.queue;

  if (!queue) {
    const message = state.initializationError
      ? `BullMQ initialization failed: ${state.initializationError.message}`
      : 'Grading queue is not initialized';
    logger.error('[BullMQ] Failed to add jobs:', message);
    return {
      success: false,
      addedCount: 0,
      error: message,
    };
  }

  try {
    const addedJobs = await queue.addBulk(
      jobs.map((job) => ({
        name: 'grade',
        data: job,
      }))
    );

    logger.info(`📝 [BullMQ] Added ${addedJobs.length} jobs to queue`);

    return { success: true, addedCount: addedJobs.length };
  } catch (error) {
    logger.error('[BullMQ] Failed to add jobs:', error);
    return {
      success: false,
      addedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to add jobs',
    };
  }
}

export async function getQueueStatus() {
  if (state.initializationError) {
    const msg = `BullMQ initialization failed: ${state.initializationError.message}`;
    console.error('[BullMQ] Init error:', msg);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      rateLimitTtl: -1,
      isProcessing: false,
      isRateLimited: false,
      error: msg,
    };
  }

  const queue = state.queue;
  const worker = state.worker;

  if (!queue || !worker) {
    const errorMessage = 'Grading queue/worker is not initialized';
    console.error('[BullMQ] ❌ Queue status error:', { message: errorMessage });
    logger.error('[BullMQ] Failed to get queue status:', errorMessage);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      rateLimitTtl: -1,
      isProcessing: false,
      isRateLimited: false,
      error: errorMessage,
    };
  }

  try {
    logger.debug('[BullMQ] Fetching queue status...');

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    let rateLimitTtl = -1;
    try {
      rateLimitTtl = await queue.getRateLimitTtl();
    } catch (e) {
      logger.debug('[BullMQ] getRateLimitTtl not available');
    }

    const isActuallyRateLimited = delayed > 0 || waiting > 0;

    logger.debug(
      `[BullMQ] Queue status: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}, delayed=${delayed}, rateLimitTtl=${rateLimitTtl}ms, isRateLimited=${isActuallyRateLimited}`
    );

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: 0,
      rateLimitTtl,
      isProcessing: active > 0,
      isRateLimited: isActuallyRateLimited,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('[BullMQ] ❌ Queue status error:', {
      message: errorMessage,
      stack: errorStack,
    });

    logger.error('[BullMQ] Failed to get queue status:', errorMessage);

    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      rateLimitTtl: -1,
      isProcessing: false,
      isRateLimited: false,
      error: errorMessage,
    };
  }
}

export async function closeGradingServices() {
  if (state.disposePromise) {
    return state.disposePromise;
  }

  state.disposePromise = closeServicesInternal()
    .catch((error) => {
      logger.error('[BullMQ] Error closing grading services:', error);
    })
    .finally(() => {
      state.disposePromise = undefined;
    });

  return state.disposePromise;
}

// Vite HMR cleanup - prevents zombie workers during development
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    logger.info('[BullMQ] Disposing BullMQ services due to HMR');
    state.disposePromise = closeServicesInternal().finally(() => {
      state.disposePromise = undefined;
    });
  });
}

/**
 * Get the current queue instance
 * Returns live reference to the queue, not a snapshot
 */
export function getQueue(): Queue<GradingJob> | null {
  return state.queue ?? null;
}

/**
 * Get the current worker instance
 * Returns live reference to the worker, not a snapshot
 */
export function getWorker(): Worker<GradingJob> | null {
  return state.worker ?? null;
}

/**
 * Get the current queue events instance
 * Returns live reference to the events, not a snapshot
 */
export function getEvents(): QueueEvents | null {
  return state.events ?? null;
}
