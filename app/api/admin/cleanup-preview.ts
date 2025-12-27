/**
 * API: Get Queue Cleanup Preview
 * GET /api/admin/cleanup-preview
 * 
 * Returns detailed information about jobs before cleanup
 */

import { requireAdmin } from '@/services/auth.server';
import { getCleanupPreview } from '@/services/queue-cleanup.server';
import logger from '@/utils/logger';

export async function loader({ request }: { request: Request }) {
  try {
    // Require ADMIN authentication
    const admin = await requireAdmin(request);
    logger.info({ adminId: admin.id, adminEmail: admin.email }, '[Admin] Getting cleanup preview');

    // Get detailed preview
    const preview = await getCleanupPreview();

    return Response.json({ success: true, preview }, { status: 200 });
  } catch (error) {
    logger.error({ error }, '[Admin] Failed to get cleanup preview');
    
    if (error instanceof Response) {
      throw error; // Re-throw auth redirects
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cleanup preview',
      },
      { status: 500 }
    );
  }
}
