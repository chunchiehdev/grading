/**
 * Enhanced Queue Cleanup Service with Job Details
 * 
 * Provides detailed job information before cleanup
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '@/utils/logger';
import { db } from '@/lib/db.server';

const QUEUE_NAME = 'grading';

export interface JobDetail {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  data: {
    resultId?: string;
    userId?: string;
    sessionId?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  assignment?: {
    id: string;
    name: string;
  };
  file?: {
    fileName: string;
  };
  addedAt?: Date;
  processedAt?: Date;
  failedReason?: string;
}

export interface CleanupPreview {
  total: number;
  byStatus: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  byUser: Record<string, { name: string; count: number }>;
  activeJobs: JobDetail[];  // Important: currently processing jobs
  recentJobs: JobDetail[];  // Sample of jobs to be cleaned
}

export interface CleanupResult {
  before: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  after: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  removed: {
    failed: number;
    completed: number;
    waiting: number;
    delayed: number;
    active: number;
  };
  timestamp: string;
}

/**
 * Get detailed preview of jobs before cleanup
 */
export async function getCleanupPreview(): Promise<CleanupPreview> {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'dev_password',
    maxRetriesPerRequest: null,
  });

  const queue = new Queue(QUEUE_NAME, { connection: redis });

  try {
    // Get all jobs by status
    const [waitingJobs, activeJobs, completedJobs, failedJobs, delayedJobs] = await Promise.all([
      queue.getWaiting(0, 100),
      queue.getActive(0, 100),
      queue.getCompleted(0, 100),
      queue.getFailed(0, 100),
      queue.getDelayed(0, 100),
    ]);

    const allJobs = [...waitingJobs, ...activeJobs, ...completedJobs, ...failedJobs, ...delayedJobs];

    // Extract user IDs and result IDs
    const userIds = new Set<string>();
    const resultIds: string[] = [];

    allJobs.forEach(job => {
      if (job.data?.userId) userIds.add(job.data.userId);
      if (job.data?.resultId) resultIds.push(job.data.resultId);
    });

    // Fetch user and result details from database
    const [users, results] = await Promise.all([
      db.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, email: true },
      }),
      db.gradingResult.findMany({
        where: { id: { in: resultIds } },
        select: {
          id: true,
          uploadedFile: { select: { originalFileName: true } },
          assignmentArea: { select: { id: true, name: true } },
        },
      }),
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const resultMap = new Map(results.map(r => [r.id, r]));

    // Build job details
    const jobDetails: JobDetail[] = allJobs.map(job => {
      const user = job.data?.userId ? userMap.get(job.data.userId) : undefined;
      const result = job.data?.resultId ? resultMap.get(job.data.resultId) : undefined;

      return {
        jobId: job.id || 'unknown',
        status: job.name === 'active' ? 'active' : 
                job.name === 'waiting' ? 'waiting' :
                job.name === 'failed' ? 'failed' :
                job.name === 'completed' ? 'completed' : 'delayed',
        data: {
          resultId: job.data?.resultId,
          userId: job.data?.userId,
          sessionId: job.data?.sessionId,
        },
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
        } : undefined,
        assignment: result?.assignmentArea ? {
          id: result.assignmentArea.id,
          name: result.assignmentArea.name || 'Untitled',
        } : undefined,
        file: result?.uploadedFile ? {
          fileName: result.uploadedFile.originalFileName,
        } : undefined,
        addedAt: job.timestamp ? new Date(job.timestamp) : undefined,
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        failedReason: job.failedReason,
      };
    });

    // Calculate statistics
    const byUser: Record<string, { name: string; count: number }> = {};
    jobDetails.forEach(job => {
      if (job.user) {
        if (!byUser[job.user.id]) {
          byUser[job.user.id] = { name: job.user.name, count: 0 };
        }
        byUser[job.user.id].count++;
      }
    });

    const preview: CleanupPreview = {
      total: allJobs.length,
      byStatus: {
        waiting: waitingJobs.length,
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        delayed: delayedJobs.length,
      },
      byUser,
      activeJobs: jobDetails.filter(j => j.status === 'active'),
      recentJobs: jobDetails.slice(0, 10), // First 10 jobs as sample
    };

    return preview;
  } catch (error) {
    logger.error({ err: error }, '[Queue Cleanup] Error getting preview:');
    throw error;
  } finally {
    await queue.close();
    await redis.quit();
  }
}

/**
 * Clean up all stuck BullMQ jobs from Redis
 */
export async function cleanupBullMQJobs(): Promise<CleanupResult> {
  logger.info('Starting BullMQ cleanup');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'dev_password',
    maxRetriesPerRequest: null,
  });

  const queue = new Queue(QUEUE_NAME, { connection: redis });

  try {
    const countsBefore = await queue.getJobCounts();
    logger.info({ countsBefore }, 'Job counts before cleanup');

    const failedCleaned = await queue.clean(1000, 100, 'failed');
    logger.info({ count: failedCleaned.length }, 'Cleaned failed jobs');

    const completedCleaned = await queue.clean(1000, 100, 'completed');
    logger.info({ count: completedCleaned.length }, 'Cleaned completed jobs');

    const waitingCleaned = await queue.clean(0, 100, 'wait');
    logger.info({ count: waitingCleaned.length }, 'Cleaned waiting jobs');

    const delayedCleaned = await queue.clean(0, 100, 'delayed');
    logger.info({ count: delayedCleaned.length }, 'Cleaned delayed jobs');

    const activeCleaned = await queue.clean(0, 100, 'active');
    logger.info({ count: activeCleaned.length }, 'Cleaned active jobs');

    const countsAfter = await queue.getJobCounts();
    logger.info({ countsAfter }, 'Job counts after cleanup');

    const result: CleanupResult = {
      before: {
        waiting: countsBefore.waiting || 0,
        active: countsBefore.active || 0,
        completed: countsBefore.completed || 0,
        failed: countsBefore.failed || 0,
        delayed: countsBefore.delayed || 0,
        paused: countsBefore.paused || 0,
      },
      after: {
        waiting: countsAfter.waiting || 0,
        active: countsAfter.active || 0,
        completed: countsAfter.completed || 0,
        failed: countsAfter.failed || 0,
        delayed: countsAfter.delayed || 0,
        paused: countsAfter.paused || 0,
      },
      removed: {
        failed: failedCleaned.length,
        completed: completedCleaned.length,
        waiting: waitingCleaned.length,
        delayed: delayedCleaned.length,
        active: activeCleaned.length,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ result }, 'Cleanup completed successfully');
    return result;
  } catch (error) {
    logger.error({ error }, 'Error during BullMQ cleanup');
    throw error;
  } finally {
    await queue.close();
    await redis.quit();
  }
}
