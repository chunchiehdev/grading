import { getUserId } from '@/services/auth.server';
import { createGradingSession, listGradingSessions, listAllGradingSessions } from '@/services/grading-session.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * GET: List grading sessions - supports both user-scoped and shared views
 * Query params:
 * - view: 'my' (default) for user's own sessions, 'all' for all users' sessions
 * - limit: pagination limit
 * - offset: pagination offset
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'my';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let result;

    if (view === 'all') {
      // List all grading sessions from all users
      result = await listAllGradingSessions(limit, offset);
    } else {
      // List only current user's grading sessions (default behavior)
      result = await listGradingSessions(userId, limit, offset);
    }

    if (result.error) {
      return Response.json(createErrorResponse(result.error, ApiErrorCode.INTERNAL_ERROR), { status: 500 });
    }

    const page = Math.floor(offset / limit) + 1;
    return Response.json(
      createSuccessResponse(result.sessions || [], {
        total: result.total || 0,
        page,
        limit,
        totalPages: Math.ceil((result.total || 0) / limit),
        view,
      })
    );
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to list sessions',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}

/**
 * POST: Create new grading session
 */
export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const method = request.method;

    if (method === 'POST') {
      const formData = await request.formData();
      const fileIds = JSON.parse((formData.get('fileIds') as string) || '[]');
      const rubricIds = JSON.parse((formData.get('rubricIds') as string) || '[]');

      // Feature 004: Context-aware grading parameters
      const assignmentAreaId = formData.get('assignmentAreaId') as string | null;
      const language = formData.get('language') as string | null;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return Response.json(createErrorResponse('At least one file is required', ApiErrorCode.VALIDATION_ERROR), {
          status: 400,
        });
      }

      if (!Array.isArray(rubricIds) || rubricIds.length === 0) {
        return Response.json(createErrorResponse('At least one rubric is required', ApiErrorCode.VALIDATION_ERROR), {
          status: 400,
        });
      }

      // Validate that fileIds and rubricIds have the same length for one-to-one pairing
      if (fileIds.length !== rubricIds.length) {
        return Response.json(
          createErrorResponse(
            'File and rubric arrays must have the same length for one-to-one pairing',
            ApiErrorCode.VALIDATION_ERROR
          ),
          { status: 400 }
        );
      }

      // Feature 004: Validate language parameter if provided
      if (language && !['zh', 'en'].includes(language)) {
        return Response.json(
          createErrorResponse('Invalid language. Must be "zh" or "en"', ApiErrorCode.VALIDATION_ERROR),
          { status: 400 }
        );
      }

      // Create file-rubric pairs
      const filePairs = fileIds.map((fileId: string, index: number) => ({
        fileId,
        rubricId: rubricIds[index],
      }));

      const result = await createGradingSession({
        userId,
        filePairs,
        assignmentAreaId: assignmentAreaId || undefined, // Feature 004
        language: language || undefined, // Feature 004
      });

      if (!result.success) {
        return Response.json(
          createErrorResponse(result.error || 'Failed to create session', ApiErrorCode.INTERNAL_ERROR),
          { status: 400 }
        );
      }

      return Response.json(createSuccessResponse({ sessionId: result.sessionId }));
    }

    return Response.json(createErrorResponse('Method not allowed', ApiErrorCode.VALIDATION_ERROR), { status: 405 });
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to create session',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
