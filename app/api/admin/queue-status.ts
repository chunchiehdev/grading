import { getQueueStatus } from '@/services/bullmq-grading.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * GET: Get BullMQ grading queue status
 *
 * Returns real-time queue statistics for monitoring
 * Includes waiting jobs, active jobs, completed jobs, failed jobs, rate limit info
 */
export async function loader() {
  try {
    const status = await getQueueStatus();

    return Response.json(
      createSuccessResponse({
        queue: 'grading',
        status: {
          waiting: status.waiting,
          active: status.active,
          completed: status.completed,
          failed: status.failed,
          delayed: status.delayed,
          paused: status.paused,
        },
        rateLimiting: {
          isRateLimited: status.isRateLimited,
          remainingTtl: status.rateLimitTtl, // Milliseconds until next job can be processed
          config: {
            max: 8, // Requests per minute (Free tier Gemini limit)
            duration: 60000, // 60 seconds
          },
        },
        mode: 'bullmq', // Indicates we're using BullMQ
        isProcessing: status.isProcessing,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get queue status',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
