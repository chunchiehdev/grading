import { getUserId } from '@/services/auth.server';
import { createEnrollment } from '@/services/course-discovery.server';
import { createEnrollmentSchema } from '@/schemas/enrollment';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * POST /api/enrollments
 * Creates a new enrollment for a student in a class
 * Request body:
 * {
 *   classId: string (UUID),
 *   courseId: string (UUID)
 * }
 */
export async function action({ request }: { request: Request }) {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return Response.json(createErrorResponse('Method not allowed', ApiErrorCode.VALIDATION_ERROR), { status: 405 });
    }

    // Authenticate user
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(createErrorResponse('Invalid request body', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    // Validate request body
    const validation = createEnrollmentSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        createErrorResponse('Invalid enrollment data', ApiErrorCode.VALIDATION_ERROR, validation.error.errors),
        { status: 400 }
      );
    }

    const { classId } = validation.data;

    // Attempt to create enrollment
    const enrollment = await createEnrollment(userId, classId);

    logger.info(`Enrollment created: studentId=${userId}, classId=${classId}`);

    return Response.json(
      createSuccessResponse({
        enrollment,
      }),
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create enrollment';

    // Handle specific error cases
    if (errorMessage.includes('already enrolled') || errorMessage.includes('Unique constraint failed')) {
      logger.warn(`Enrollment conflict: ${errorMessage}`);
      return Response.json(createErrorResponse(errorMessage, ApiErrorCode.VALIDATION_ERROR), { status: 409 });
    }

    if (
      errorMessage.includes('at capacity') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('not active')
    ) {
      logger.warn(`Enrollment validation failed: ${errorMessage}`);
      return Response.json(createErrorResponse(errorMessage, ApiErrorCode.VALIDATION_ERROR), { status: 409 });
    }

    logger.error({ err: error }, 'Enrollment error:');
    return Response.json(createErrorResponse('Failed to create enrollment', ApiErrorCode.INTERNAL_ERROR), {
      status: 500,
    });
  }
}
