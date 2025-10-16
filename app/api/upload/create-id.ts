import { v4 as uuidv4 } from 'uuid';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { getUserId } from '@/services/auth.server';
import { createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * API endpoint to generate a new upload session ID with user identification
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with unique upload ID
 */
export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== 'POST') {
      return createApiResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const userId = await getUserId(request);

    if (!userId) {
      return createApiResponse({ success: false, error: 'Authentication required' }, 401);
    }

    const uploadId = `${userId}-${uuidv4()}`;

    return createApiResponse({ uploadId });
  });
}

/**
 * API endpoint loader that rejects GET requests for upload ID creation
 * @returns {Promise<Response>} JSON error response indicating POST method required
 */
export async function loader() {
  return Response.json(createErrorResponse('use POST to upload ID', ApiErrorCode.VALIDATION_ERROR), { status: 405 });
}
