/**
 * Admin API: Cleanup BullMQ Jobs
 * 
 * POST /api/admin/cleanup-jobs
 * Cleans up all stuck BullMQ jobs from the grading queue
 * ADMIN-only access
 */

import { requireAdmin } from '@/services/auth.server';
import { cleanupBullMQJobs } from '@/services/queue-cleanup.server';
import logger from '@/utils/logger';

export async function action({ request }: { request: Request }) {
  try {
    // Require ADMIN authentication
    const admin = await requireAdmin(request);
    logger.info({ adminId: admin.id, adminEmail: admin.email }, 'Admin initiated BullMQ cleanup');

    // Perform cleanup
    const result = await cleanupBullMQJobs();

    logger.info({ result, adminId: admin.id }, 'BullMQ cleanup completed');

    return Response.json({
      success: true,
      data: result,
      message: 'Queue cleanup completed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup BullMQ jobs');

    // Handle authentication errors (thrown by requireAdmin)
    if (error instanceof Response) {
      throw error;
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to cleanup jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
