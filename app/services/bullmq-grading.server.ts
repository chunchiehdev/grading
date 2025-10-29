import { Queue, Worker, QueueEvents } from 'bullmq';
import { bullmqRedis } from '@/lib/redis';
import logger from '@/utils/logger';
import { processGradingResult } from './grading-engine.server';
import { updateGradingSessionProgress } from './grading-session.server';

console.log('[BullMQ] Module loaded, imports successful');

export interface GradingJob {
  resultId: string;
  userId: string;
  sessionId: string;
  userLanguage?: 'zh' | 'en';
}

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAME = 'grading';
let initializationError: Error | null = null;
let gradingQueueInstance: Queue<GradingJob> | null = null;

// Try to initialize queue, but don't fail if Redis is not ready yet
// Type allows null for error state
let gradingQueue: Queue<GradingJob> | null = null;
try {
  console.log('[BullMQ] Step 1: About to create Queue instance...');
  console.log('[BullMQ] bullmqRedis type:', typeof bullmqRedis, bullmqRedis ? 'defined' : 'null');

  logger.info('[BullMQ] Initializing grading queue...');

  /**
   * Global grading queue (shared across all Pods)
   * All jobs are persisted in Redis
   */
  gradingQueue = new Queue<GradingJob>(QUEUE_NAME, {
    connection: bullmqRedis,
    defaultJobOptions: {
      attempts: 3, // 失敗重試 3 次
      backoff: {
        type: 'exponential',
        delay: 5000, // 指數退避：5s, 10s, 20s
      },
      removeOnComplete: 100, // 保留最近 100 個完成的工作
      removeOnFail: 500, // 保留最近 500 個失敗的工作
    },
  });

  console.log('[BullMQ] Step 2: Queue instance created successfully');

  gradingQueueInstance = gradingQueue;
  logger.info('[BullMQ] ✅ Grading queue initialized successfully');
  console.log('[BullMQ] ✅ Grading queue initialized successfully');
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : '';
  initializationError = error instanceof Error ? error : new Error(String(error));

  console.error('[BullMQ] ❌ Queue initialization failed:', errMsg);
  console.error('[BullMQ] Stack:', errStack);
  logger.error('[BullMQ] ❌ Failed to initialize grading queue:', initializationError);

  // Keep gradingQueue as null; callers will handle the error state
}

// ============================================================================
// Worker Configuration (Global Rate Limiter)
// ============================================================================

/**
 * Worker processing jobs from the grading queue
 *
 * Rate Limiting Strategy:
 * - Gemini Free tier: 10 RPM (requests per minute)
 * - We limit to 8 RPM to leave buffer for other operations
 * - This is GLOBAL across all Pods thanks to Redis-backed limiter
 * - All Pods share the same rate limit window
 */
/**
 * Worker processing jobs from the grading queue
 * Uses dedicated Redis connection with maxRetriesPerRequest: null
 * (required for BullMQ blocking operations)
 */
let gradingWorker: Worker<GradingJob> | null = null;
try {
  console.log('[BullMQ] Step 3: About to create Worker instance...');
  logger.info('[BullMQ] Initializing grading worker...');

  gradingWorker = new Worker<GradingJob>(
    QUEUE_NAME,
    async (job) => {
      const { resultId, userId, sessionId, userLanguage } = job.data;

      logger.info(
        `🏃 [BullMQ] Processing job ${job.id} for result ${resultId} (attempt ${job.attemptsMade + 1}/3)`
      );

    try {
      // Call existing grading logic
      const result = await processGradingResult(resultId, userId, sessionId, userLanguage || 'zh');

      if (!result.success) {
        throw new Error(result.error || 'Grading failed');
      }

      // Update session progress
      await updateGradingSessionProgress(sessionId, userId);

      logger.info(`✅ [BullMQ] Completed job ${job.id} for result ${resultId}`);
      return result;
    } catch (error) {
      logger.error(
        `❌ [BullMQ] Failed job ${job.id} (attempt ${job.attemptsMade + 1}/3):`,
        error
      );

      // If it's a rate limit error, mark as RateLimitError (will retry)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('503') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('UNAVAILABLE')
      ) {
        logger.warn(`⚠️ [BullMQ] Rate limit/Service issue detected, will retry: ${errorMessage}`);
        throw Worker.RateLimitError();  // Retry with exponential backoff
      }

      throw error;
    }
  },
  {
    connection: bullmqRedis, // Use dedicated BullMQ Redis connection (maxRetriesPerRequest: null)
    concurrency: 1, // 每個 worker 一次處理 1 個工作

    // 🔥 Global Rate Limiter Configuration
    // This ensures ALL Pods respect the same rate limit!
    limiter: {
      max: 8, // Free tier 10 RPM，留 2 個緩衝給其他操作
      duration: 60000, // 60 秒
      groupKey: 'gemini-api', // Identify this rate limit group
    },
  }
  );

  console.log('[BullMQ] Step 4: Worker instance created successfully');
  logger.info('[BullMQ] ✅ Grading worker initialized successfully');
  console.log('[BullMQ] ✅ Grading worker initialized successfully');
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : '';
  const workerError = error instanceof Error ? error : new Error(String(error));

  console.error('[BullMQ] ❌ Worker initialization failed:', errMsg);
  console.error('[BullMQ] Stack:', errStack);
  logger.error('[BullMQ] ❌ Failed to initialize grading worker:', workerError);

  // Set initialization error so getQueueStatus can report it
  if (!initializationError) {
    initializationError = workerError;
  }

  // Keep gradingWorker as null; callers will handle the error state
}

// ============================================================================
// Event Listeners
// ============================================================================

let queueEvents: QueueEvents | null = null;
try {
  queueEvents = new QueueEvents(QUEUE_NAME, { connection: bullmqRedis });
} catch (error) {
  logger.error('[BullMQ] Failed to initialize queue events:', error);
}

if (queueEvents) {
  queueEvents.on('completed', ({ jobId }) => {
    logger.info(`🎉 [BullMQ] Job ${jobId} completed`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`💥 [BullMQ] Job ${jobId} failed: ${failedReason}`);
  });

  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`⚠️ [BullMQ] Job ${jobId} stalled (worker might have died)`);
  });

  queueEvents.on('error', (err) => {
    logger.error(`💥 [BullMQ] Queue events error:`, err);
  });
}

// ============================================================================
// Public API (Compatible with old interface)
// ============================================================================

/**
 * Add grading jobs to the queue
 * This replaces the old simple-grading.server.ts addGradingJobs
 *
 * Jobs are added to Redis queue, persisted across Pod restarts
 */
export async function addGradingJobs(jobs: GradingJob[]): Promise<{
  success: boolean;
  addedCount: number;
  error?: string;
}> {
  try {
    // Bulk add jobs to Redis-backed queue
    const addedJobs = await gradingQueue.addBulk(
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

/**
 * Get current queue status
 * Useful for monitoring and debugging
 */
export async function getQueueStatus() {
  try {
    // Guard: Check initialization first
    if (initializationError) {
      const msg = `BullMQ initialization failed: ${initializationError.message}`;
      console.error('[BullMQ] Init error:', msg);
      throw new Error(msg);
    }

    if (!gradingQueue) {
      console.error('[BullMQ] Queue is null');
      throw new Error('Grading queue is not initialized');
    }

    if (!gradingWorker) {
      console.error('[BullMQ] Worker is null');
      throw new Error('Grading worker is not initialized');
    }

    logger.debug('[BullMQ] Fetching queue status...');

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      gradingQueue.getWaitingCount(),
      gradingQueue.getActiveCount(),
      gradingQueue.getCompletedCount(),
      gradingQueue.getFailedCount(),
      gradingQueue.getDelayedCount(),
    ]);

    let rateLimitTtl = -1;
    try {
      rateLimitTtl = await gradingQueue.getRateLimitTtl();
    } catch (e) {
      // getRateLimitTtl might not be available in all versions
      logger.debug('[BullMQ] getRateLimitTtl not available');
    }

    // 正確的 rate limit 判斷邏輯：
    // 只有當有任務被延遲（delayed > 0）或在等待隊列中（waiting > 0）時，才真正被限流
    // getRateLimitTtl 只是返回時間窗口的剩餘時間，不代表被限流
    const isActuallyRateLimited = delayed > 0 || waiting > 0;

    logger.debug(`[BullMQ] Queue status: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}, delayed=${delayed}, rateLimitTtl=${rateLimitTtl}ms, isRateLimited=${isActuallyRateLimited}`);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: 0, // Not available in this version
      rateLimitTtl, // Remaining time in current rate limit window
      isProcessing: active > 0,
      isRateLimited: isActuallyRateLimited, // True only if jobs are delayed or waiting
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

/**
 * Gracefully close worker and queue
 * Called during app shutdown (SIGTERM, SIGINT)
 */
export async function closeGradingServices() {
  logger.info('🛑 [BullMQ] Closing worker and queue...');
  try {
    await gradingWorker.close();
    await gradingQueue.close();
    await queueEvents.close();
    logger.info('✅ [BullMQ] Services closed successfully');
  } catch (error) {
    logger.error('[BullMQ] Error closing services:', error);
  }
}

// ============================================================================
// Exports for initialization
// ============================================================================

export { gradingQueue as queue, gradingWorker as worker, queueEvents as events };
