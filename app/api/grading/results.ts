import { getUserId } from '@/services/auth.server';
import { 
  getSessionGradingResults,
  getGradingResult,
  updateGradingResult,
  failGradingResult 
} from '@/services/grading-result.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * GET: Get grading results for a session or specific result
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), 
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const resultId = url.searchParams.get('resultId');

    if (resultId) {
      // Get specific result
      const result = await getGradingResult(resultId, userId);
      if (result.error) {
        return Response.json(
          createErrorResponse(result.error, ApiErrorCode.NOT_FOUND), 
          { status: 404 }
        );
      }
      return Response.json(createSuccessResponse(result.result));
    }

    if (sessionId) {
      // Get all results for session
      const result = await getSessionGradingResults(sessionId, userId);
      if (result.error) {
        return Response.json(
          createErrorResponse(result.error, ApiErrorCode.INTERNAL_ERROR), 
          { status: 500 }
        );
      }
      return Response.json(createSuccessResponse(result.results));
    }

    return Response.json(
      createErrorResponse('sessionId or resultId is required', ApiErrorCode.VALIDATION_ERROR), 
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get results',
        ApiErrorCode.INTERNAL_ERROR
      ), 
      { status: 500 }
    );
  }
}

/**
 * POST: Update grading result
 */
export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), 
        { status: 401 }
      );
    }

    if (request.method !== 'POST') {
      return Response.json(
        createErrorResponse('Method not allowed', ApiErrorCode.VALIDATION_ERROR), 
        { status: 405 }
      );
    }

    const formData = await request.formData();
    const resultId = formData.get('resultId') as string;
    const action = formData.get('action') as string;

    if (!resultId) {
      return Response.json(
        createErrorResponse('Result ID is required', ApiErrorCode.VALIDATION_ERROR), 
        { status: 400 }
      );
    }

    switch (action) {
      case 'complete': {
        const gradingDataStr = formData.get('gradingData') as string;
        const metadataStr = formData.get('metadata') as string;

        if (!gradingDataStr) {
          return Response.json(
            createErrorResponse('Grading data is required', ApiErrorCode.VALIDATION_ERROR), 
            { status: 400 }
          );
        }

        const gradingData = JSON.parse(gradingDataStr);
        const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;

        const result = await updateGradingResult(resultId, gradingData, metadata);
        if (!result.success) {
          return Response.json(
            createErrorResponse(result.error || 'Failed to update result', ApiErrorCode.INTERNAL_ERROR), 
            { status: 400 }
          );
        }

        return Response.json(createSuccessResponse({}));
      }

      case 'fail': {
        const errorMessage = formData.get('errorMessage') as string;
        if (!errorMessage) {
          return Response.json(
            createErrorResponse('Error message is required', ApiErrorCode.VALIDATION_ERROR), 
            { status: 400 }
          );
        }

        const result = await failGradingResult(resultId, errorMessage);
        if (!result.success) {
          return Response.json(
            createErrorResponse(result.error || 'Failed to fail result', ApiErrorCode.INTERNAL_ERROR), 
            { status: 400 }
          );
        }

        return Response.json(createSuccessResponse({}));
      }

      default:
        return Response.json(
          createErrorResponse('Invalid action', ApiErrorCode.VALIDATION_ERROR), 
          { status: 400 }
        );
    }
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update result',
        ApiErrorCode.INTERNAL_ERROR
      ), 
      { status: 500 }
    );
  }
}