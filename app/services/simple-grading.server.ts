import logger from '@/utils/logger';
import { processGradingResult } from './grading-engine.server';
import { updateGradingSessionProgress } from './grading-session.server';

export interface SimpleGradingJob {
  resultId: string;
  userId: string;
  sessionId: string;
  userLanguage?: 'zh' | 'en';
}

// Simple in-memory job tracking
const activeJobs = new Set<string>();
const jobQueue: SimpleGradingJob[] = [];
let isProcessing = false;
let lastProcessingError: string | null = null;
let consecutive503Errors = 0;

/**
 * Add jobs to simple processing queue
 */
export async function addGradingJobs(jobs: SimpleGradingJob[]): Promise<{
  success: boolean;
  addedCount: number;
  error?: string;
}> {
  try {
    // Add jobs to queue
    jobQueue.push(...jobs);

    logger.info(`📝 Added ${jobs.length} jobs to simple processing queue (queue size: ${jobQueue.length})`);

    // Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }

    return { success: true, addedCount: jobs.length };
  } catch (error) {
    logger.error('Failed to add jobs to simple queue:', error);
    return {
      success: false,
      addedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to add jobs',
    };
  }
}

/**
 * Calculate intelligent delay based on recent errors
 */
function calculateIntelligentDelay(): number {
  // Base delay
  let delay = 3000;

  // Increase delay based on consecutive 503 errors
  if (consecutive503Errors > 0) {
    delay = Math.min(3000 + consecutive503Errors * 30000, 180000); // 最多3分鐘
    logger.warn(`🚫 Increased delay due to ${consecutive503Errors} consecutive 503 errors: ${delay / 1000}s`);
  }

  // Add some randomization to avoid thundering herd
  delay += Math.random() * 2000;

  return delay;
}

/**
 * Process jobs from the queue
 */
async function processQueue() {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }

  isProcessing = true;
  logger.info(`🚀 Starting to process ${jobQueue.length} jobs (503 errors: ${consecutive503Errors})`);

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;

    // Skip if already processing this result
    if (activeJobs.has(job.resultId)) {
      continue;
    }

    activeJobs.add(job.resultId);

    try {
      logger.info(`🏃 Processing grading job for result ${job.resultId} (${jobQueue.length} remaining)`);

      const result = await processGradingResult(job.resultId, job.userId, job.sessionId, job.userLanguage || 'zh');

      if (result.success) {
        logger.info(`  Completed grading job for result ${job.resultId}`);
        consecutive503Errors = 0; // Reset 503 error count on success
        lastProcessingError = null;
      } else {
        logger.error(`❌ Failed grading job for result ${job.resultId}: ${result.error}`);

        // Check if it's a 503 error
        if (result.error?.includes('503') || result.error?.includes('overloaded')) {
          consecutive503Errors++;
          logger.warn(`📈 Consecutive 503 errors: ${consecutive503Errors}`);

          // If we have too many 503 errors, pause processing for longer
          if (consecutive503Errors >= 3) {
            const pauseTime = Math.min(consecutive503Errors * 60000, 300000); // 最多5分鐘
            logger.warn(`🛑 Too many 503 errors, pausing queue processing for ${pauseTime / 1000}s`);
            await new Promise((resolve) => setTimeout(resolve, pauseTime));
          }
        } else {
          consecutive503Errors = 0; // Reset for non-503 errors
        }

        lastProcessingError = result.error || 'Unknown error';
      }

      // Update session progress after each job
      await updateGradingSessionProgress(job.sessionId, job.userId);
    } catch (error) {
      logger.error(`💥 Error processing job for result ${job.resultId}:`, error);

      // Check if the error indicates service overload
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        consecutive503Errors++;
      }

      lastProcessingError = errorMessage;
    } finally {
      activeJobs.delete(job.resultId);
    }

    // Intelligent delay between jobs
    if (jobQueue.length > 0) {
      const delay = calculateIntelligentDelay();
      logger.info(`⏳ Waiting ${Math.round(delay / 1000)}s before next job...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  isProcessing = false;
  logger.info(`🎉 Finished processing all jobs (final 503 count: ${consecutive503Errors})`);
}

/**
 * Get simple queue status with error information
 */
export function getSimpleQueueStatus() {
  return {
    waiting: jobQueue.length,
    active: activeJobs.size,
    completed: 0, // We don't track completed jobs in memory
    failed: 0, // We don't track failed jobs in memory
    isProcessing,
    consecutive503Errors,
    lastError: lastProcessingError,
  };
}
