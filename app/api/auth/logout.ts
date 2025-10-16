import { logout } from '@/services/auth.server';
import { createSuccessResponse } from '@/types/api';

/**
 * API endpoint to handle logout status check
 * @returns {Promise<Response>} JSON response indicating success
 */
export async function loader() {
  return Response.json(createSuccessResponse({}));
}

/**
 * API endpoint to perform user logout and destroy session
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object with session
 * @returns {Promise<Response>} JSON response with session destruction cookie
 */
export async function action({ request }: { request: Request }) {
  const cookie = await logout(request);

  return Response.json(createSuccessResponse({}), {
    headers: {
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
