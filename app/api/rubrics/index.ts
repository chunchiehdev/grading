import { requireTeacher } from '@/services/auth.server';
import { listRubrics } from '@/services/rubric.server';
import { createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * API endpoint to get user's rubrics
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with user's rubrics list
 */
export async function loader({ request }: { request: Request }) {
  try {
    const teacher = await requireTeacher(request);

    const { rubrics, error } = await listRubrics(teacher.id);

    if (error) {
      return Response.json(createErrorResponse(error, ApiErrorCode.INTERNAL_ERROR), { status: 500 });
    }

    return Response.json({
      success: true,
      rubrics: rubrics || [],
    });
  } catch (error) {
    console.error('Failed to load rubrics:', error);
    return Response.json(createErrorResponse('Failed to load rubrics', ApiErrorCode.INTERNAL_ERROR), { status: 500 });
  }
}
