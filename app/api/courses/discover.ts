import { getUserId } from '@/services/auth.server';
import { getDiscoverableCourses, getStudentEnrolledCourseIds } from '@/services/course-discovery.server';
import { courseDiscoveryQuerySchema } from '@/schemas/enrollment';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * GET /api/courses/discover
 * Fetches discoverable courses for a student
 * Query parameters:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - sort: 'newest' | 'teacher' | 'name' (default 'newest')
 * - search: string (optional search term)
 */
export async function loader({ request }: { request: Request }) {
  try {
    // Authenticate user
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const sort = (url.searchParams.get('sort') || 'newest') as 'newest' | 'teacher' | 'name';
    const search = url.searchParams.get('search') || undefined;

    // Validate query parameters
    const queryValidation = courseDiscoveryQuerySchema.safeParse({
      limit,
      offset,
      sort,
      search,
    });

    if (!queryValidation.success) {
      return Response.json(
        createErrorResponse('Invalid query parameters', ApiErrorCode.VALIDATION_ERROR, queryValidation.error.errors),
        { status: 400 }
      );
    }

    // Fetch discoverable courses
    const { courses, total, hasMore } = await getDiscoverableCourses({
      limit,
      offset,
      sort,
      search,
    });

    // Get student's enrolled course IDs
    const enrolledCourseIds = await getStudentEnrolledCourseIds(userId);

    // Add enrollment status to courses
    const coursesWithStatus = courses.map((course) => ({
      ...course,
      enrollmentStatus: enrolledCourseIds.has(course.id) ? 'enrolled' : ('not_enrolled' as const),
    }));

    logger.info(`Discovery page loaded: userId=${userId}, courses=${courses.length}, total=${total}`);

    return Response.json(
      createSuccessResponse(
        {
          courses: coursesWithStatus,
          total,
          hasMore,
        },
        {
          total,
          limit,
          offset,
          hasMore,
        }
      )
    );
  } catch (error) {
    logger.error({ err: error }, 'Error in course discovery:');
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch courses',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
