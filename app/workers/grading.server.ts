import { Worker } from 'bullmq';
import { bullmqRedis } from '@/lib/redis';
import logger from '@/utils/logger';
import { processGradingResult } from '@/services/grading-engine.server';
import { updateGradingSessionProgress } from '@/services/grading-session.server';
import { GRADING_QUEUE_NAME, GradingJob } from '@/services/queue.server';

let gradingWorker: Worker<GradingJob> | null = null;

declare global {
  var __gradingWorker: Worker<GradingJob> | undefined;
}

export function initGradingWorker() {
  if (gradingWorker) return;

  // In development, use global variable to prevent multiple workers on HMR
  if (process.env.NODE_ENV !== 'production' && global.__gradingWorker) {
    gradingWorker = global.__gradingWorker;
    return;
  }

  logger.info('[BullMQ] Initializing grading worker...');

  gradingWorker = new Worker<GradingJob>(
    GRADING_QUEUE_NAME,
    async (job) => {
      const { resultId, userId, sessionId, userLanguage, useDirectGrading } = job.data;

      logger.info(
        `🏃 [BullMQ] Processing job ${job.id} for result ${resultId} (attempt ${job.attemptsMade + 1})`
      );

      try {
        const result = await processGradingResult(resultId, userId, sessionId, userLanguage || 'zh', useDirectGrading);

        if (!result.success) {
          throw new Error(result.error || 'Grading failed');
        }

        await updateGradingSessionProgress(sessionId, userId);

        logger.info(`  [BullMQ] Completed job ${job.id} for result ${resultId}`);
        return result;
      } catch (error) {
        logger.error({ err: error }, `❌ [BullMQ] Failed job ${job.id}:`);
        throw error;
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 1, // Process one at a time per worker instance
      limiter: {
        max: 15,
        duration: 60000, // 15 requests per minute
      },
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    global.__gradingWorker = gradingWorker;
  }

  logger.info('[BullMQ] Grading worker initialized successfully');
}

export async function closeGradingServices() {
  if (gradingWorker) {
    await gradingWorker.close();
    gradingWorker = null;
    if (process.env.NODE_ENV !== 'production') {
      global.__gradingWorker = undefined;
    }
    logger.info('[BullMQ] Grading worker closed');
  }
}

// Initialize immediately when imported
initGradingWorker();
