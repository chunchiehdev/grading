import { getQueueStatus } from '@/services/queue.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import { requireAdmin } from '@/services/auth.server';
import logger from '@/utils/logger';

/**
 * GET: Get BullMQ grading queue status
 *
 * Returns real-time queue statistics for monitoring
 * Includes waiting jobs, active jobs, completed jobs, failed jobs, rate limit info
 * ADMIN-only access
 */
export async function loader({ request }: { request: Request }) {
  try {
    // Require ADMIN authentication
    await requireAdmin(request);
    
    logger.info('[Queue Status API] Fetching queue status...');
    const status = await getQueueStatus();
    logger.info({ status }, '[Queue Status API] Status retrieved:');

    // Check if getQueueStatus returned an error
    if ('error' in status && status.error) {
      logger.error({ error: status.error }, '[Queue Status API] Queue status has error:');
      return Response.json(
        createErrorResponse(
          status.error,
          ApiErrorCode.INTERNAL_ERROR
        ),
        { status: 500 }
      );
    }

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
          remainingTtl: status.rateLimitTtl,
          config: {
            max: 8,
            duration: 60000,
          },
        },
        mode: 'bullmq',
        isProcessing: status.isProcessing,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, '[Queue Status API] Exception in loader:');
    
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get queue status',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
