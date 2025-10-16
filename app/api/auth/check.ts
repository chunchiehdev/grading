import { getUser } from '@/services/auth.server';
import { withErrorHandler } from '@/middleware/api.server';
import { createSuccessResponse } from '@/types/api';

/**
 * API endpoint to check user authentication status
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with user data or 401 if not authenticated
 */
export async function loader({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    const user = await getUser(request);
    if (!user) {
      return Response.json(null, { status: 401 });
    }
    return Response.json(createSuccessResponse({ user }));
  });
}
