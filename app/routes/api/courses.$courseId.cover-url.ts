import type { LoaderFunctionArgs } from 'react-router';
import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { getPresignedDownloadUrl } from '@/services/storage.server';
import logger from '@/utils/logger';

/**
 * GET /api/courses/:courseId/cover
 * Returns a presigned URL for the course cover image
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { courseId } = params;

  if (!courseId) {
    return Response.json({ success: false, error: 'Course ID is required' }, { status: 400 });
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { coverImage: true },
    });

    if (!course) {
      return Response.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    if (!course.coverImage) {
      return Response.json({ success: true, coverImage: null });
    }

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getPresignedDownloadUrl(course.coverImage, 3600);

    return Response.json({ success: true, coverImage: presignedUrl });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cover image URL:');
    return Response.json({ success: false, error: 'Failed to get cover image' }, { status: 500 });
  }
}
