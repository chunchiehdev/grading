import logger from '@/utils/logger';
import { processGradingResult } from './grading-engine.server';
import { updateGradingSessionProgress } from './grading-session.server';

export interface SimpleGradingJob {
  resultId: string;
  userId: string;
  sessionId: string;
}

// Simple in-memory job tracking
const activeJobs = new Set<string>();
const jobQueue: SimpleGradingJob[] = [];
let isProcessing = false;

/**
 * Add jobs to simple processing queue
 */
export async function addGradingJobs(jobs: SimpleGradingJob[]): Promise<{ 
  success: boolean; 
  addedCount: number; 
  error?: string 
}> {
  try {
    // Add jobs to queue
    jobQueue.push(...jobs);
    
    logger.info(`📝 Added ${jobs.length} jobs to simple processing queue`);
    
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
      error: error instanceof Error ? error.message : 'Failed to add jobs' 
    };
  }
}

/**
 * Process jobs from the queue
 */
async function processQueue() {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  logger.info(`🚀 Starting to process ${jobQueue.length} jobs`);
  
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;
    
    // Skip if already processing this result
    if (activeJobs.has(job.resultId)) {
      continue;
    }
    
    activeJobs.add(job.resultId);
    
    try {
      logger.info(`🏃 Processing grading job for result ${job.resultId}`);
      
      const result = await processGradingResult(job.resultId);
      
      if (result.success) {
        logger.info(`✅ Completed grading job for result ${job.resultId}`);
      } else {
        logger.error(`❌ Failed grading job for result ${job.resultId}: ${result.error}`);
      }
      
      // Update session progress after each job
      await updateGradingSessionProgress(job.sessionId, job.userId);
      
    } catch (error) {
      logger.error(`💥 Error processing job for result ${job.resultId}:`, error);
    } finally {
      activeJobs.delete(job.resultId);
    }
    
    // Add small delay between jobs to prevent overwhelming the API
    if (jobQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  isProcessing = false;
  logger.info(`🎉 Finished processing all jobs`);
}

/**
 * Get simple queue status
 */
export function getSimpleQueueStatus() {
  return {
    waiting: jobQueue.length,
    active: activeJobs.size,
    completed: 0, // We don't track completed jobs in memory
    failed: 0,    // We don't track failed jobs in memory
  };
} 