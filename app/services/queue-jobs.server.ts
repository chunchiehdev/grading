/**
 * Get Active/Waiting Queue Jobs Details
 * Returns detailed information about currently active and waiting jobs
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '@/utils/logger';
import { db } from '@/lib/db.server';

const QUEUE_NAME = 'grading';

export interface JobDetail {
  jobId: string;
  status: 'waiting' | 'active';
  addedAt: Date;
  processedAt?: Date;
  data: {
    resultId: string;
    userId: string;
    sessionId: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  assignment?: {
    id: string;
    name: string;
    courseName: string;
  };
  file?: {
    fileName: string;
  };
}

/**
 * Get detailed information for active and waiting jobs
 */
export async function getActiveJobsDetails(): Promise<JobDetail[]> {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  const queue = new Queue(QUEUE_NAME, { connection: redis });

  try {
    // Get active and waiting jobs
    const [activeJobs, waitingJobs] = await Promise.all([
      queue.getActive(0, 50),
      queue.getWaiting(0, 50),
    ]);

    const allJobs = [
      ...activeJobs.map(j => ({ ...j, status: 'active' as const })),
      ...waitingJobs.map(j => ({ ...j, status: 'waiting' as const })),
    ];

    if (allJobs.length === 0) {
      return [];
    }

    // Extract user IDs and result IDs
    const userIds = new Set<string>();
    const resultIds: string[] = [];

    allJobs.forEach((job) => {
      if (job.data?.userId) userIds.add(job.data.userId);
      if (job.data?.resultId) resultIds.push(job.data.resultId);
    });

    // Fetch user and assignment details from database
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
          assignmentArea: {
            select: {
              id: true,
              name: true,
              course: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const resultMap = new Map(results.map((r) => [r.id, r]));

    // Build job details
    const jobDetails: JobDetail[] = [];
    
    for (const job of allJobs) {
      if (!job.id || !job.data) continue;

      const user = job.data.userId ? userMap.get(job.data.userId) : undefined;
      const result = job.data.resultId ? resultMap.get(job.data.resultId) : undefined;

      jobDetails.push({
        jobId: job.id,
        status: job.status,
        addedAt: new Date(job.timestamp || Date.now()),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        data: {
          resultId: job.data.resultId || '',
          userId: job.data.userId || '',
          sessionId: job.data.sessionId || '',
        },
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : undefined,
        assignment: result?.assignmentArea
          ? {
              id: result.assignmentArea.id,
              name: result.assignmentArea.name || 'Untitled',
              courseName: result.assignmentArea.course?.name || 'Unknown Course',
            }
          : undefined,
        file: result?.uploadedFile
          ? {
              fileName: result.uploadedFile.originalFileName,
            }
          : undefined,
      });
    }

    // Sort by newest first
    jobDetails.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());

    return jobDetails;
  } catch (error) {
    logger.error({ err: error }, '[Queue Jobs] Error getting job details:');
    throw error;
  } finally {
    await queue.close();
    await redis.quit();
  }
}
