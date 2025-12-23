import { Queue, QueueEvents } from 'bullmq';
import { bullmqRedis } from '@/lib/redis';
import logger from '@/utils/logger';

export interface GradingJob {
  resultId: string;
  userId: string;
  sessionId: string;
  userLanguage?: 'zh' | 'en';
  useDirectGrading?: boolean;
}

export const GRADING_QUEUE_NAME = 'grading';

// Singleton pattern for Queue to avoid multiple connections in dev
let gradingQueue: Queue<GradingJob>;
let gradingQueueEvents: QueueEvents;

declare global {
  var __gradingQueue: Queue<GradingJob> | undefined;
  var __gradingQueueEvents: QueueEvents | undefined;
}

if (process.env.NODE_ENV === 'production') {
  gradingQueue = new Queue<GradingJob>(GRADING_QUEUE_NAME, {
    connection: bullmqRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  gradingQueueEvents = new QueueEvents(GRADING_QUEUE_NAME, { connection: bullmqRedis });
} else {
  if (!global.__gradingQueue) {
    global.__gradingQueue = new Queue<GradingJob>(GRADING_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  gradingQueue = global.__gradingQueue;

  if (!global.__gradingQueueEvents) {
    global.__gradingQueueEvents = new QueueEvents(GRADING_QUEUE_NAME, { connection: bullmqRedis });
  }
  gradingQueueEvents = global.__gradingQueueEvents;
}

gradingQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`🎉 [BullMQ] Job ${jobId} completed`);
});

gradingQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`💥 [BullMQ] Job ${jobId} failed: ${failedReason}`);
});

export { gradingQueue, gradingQueueEvents };

export async function getQueueStatus() {
  if (!gradingQueue) {
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
      error: 'Queue not initialized',
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      gradingQueue.getWaitingCount(),
      gradingQueue.getActiveCount(),
      gradingQueue.getCompletedCount(),
      gradingQueue.getFailedCount(),
      gradingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: 0,
      rateLimitTtl: -1,
      isProcessing: active > 0,
      isRateLimited: delayed > 0,
    };
  } catch (error) {
    logger.error('[BullMQ] Failed to get queue status:', error);
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
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}
