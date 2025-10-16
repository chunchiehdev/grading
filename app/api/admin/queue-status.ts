import { getSimpleQueueStatus } from '@/services/simple-grading.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * GET: Get queue status
 */
export async function loader() {
  try {
    const status = getSimpleQueueStatus();

    return Response.json(
      createSuccessResponse({
        status: {
          waiting: status.waiting,
          active: status.active,
          completed: status.completed,
          failed: status.failed,
        },
        mode: 'simple_processing',
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
