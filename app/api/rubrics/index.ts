import { listRubrics } from '@/services/rubric.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * API endpoint to get all rubrics
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with rubrics list
 */
export async function loader({ request }: { request: Request }) {
  try {
    const { rubrics, error } = await listRubrics();

    if (error) {
      return Response.json(
        createErrorResponse(error, ApiErrorCode.INTERNAL_ERROR),
        { status: 500 }
      );
    }

    return Response.json(
      createSuccessResponse(rubrics || [])
    );
  } catch (error) {
    console.error('Failed to load rubrics:', error);
    return Response.json(
      createErrorResponse('Failed to load rubrics', ApiErrorCode.INTERNAL_ERROR),
      { status: 500 }
    );
  }
} 