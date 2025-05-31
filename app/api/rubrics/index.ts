import { listRubrics } from '@/services/rubric.server';

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
        { success: false, error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      rubrics: rubrics || [],
    });
  } catch (error) {
    console.error('Failed to load rubrics:', error);
    return Response.json(
      { success: false, error: 'Failed to load rubrics' },
      { status: 500 }
    );
  }
} 