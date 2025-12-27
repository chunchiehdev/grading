/**
 * API: Get Active/Waiting Queue Jobs
 * GET /api/admin/queue-jobs
 * 
 * Returns detailed information about currently active and waiting jobs
 */

import { requireAdmin } from '@/services/auth.server';
import { getActiveJobsDetails } from '@/services/queue-jobs.server';
import logger from '@/utils/logger';

export async function loader({ request }: { request: Request }) {
  try {
    // Require ADMIN authentication
    await requireAdmin(request);

    // Get job details
    const jobs = await getActiveJobsDetails();

    return Response.json({ success: true, jobs }, { status: 200 });
  } catch (error) {
    logger.error({ error }, '[Admin] Failed to get queue jobs');
    
    if (error instanceof Response) {
      throw error; // Re-throw auth redirects
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get queue jobs',
      },
      { status: 500 }
    );
  }
}
