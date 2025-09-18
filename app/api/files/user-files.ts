import { getUserFiles } from '@/services/uploaded-file.server';
import {
  createPaginatedResponse,
  createErrorResponse,
  ApiErrorCode
} from '@/types/api';
import { withAuth } from '@/middleware/api.server';

/**
 * API endpoint to get user's uploaded files with parsing status
 * @param {Object} params - Route parameters including authenticated user
 * @param {Request} params.request - HTTP request object
 * @param {Object} params.user - Authenticated user object
 * @returns {Promise<Response>} JSON response with user's files
 */
export const loader = withAuth(async ({ request, user }) => {

  const url = new URL(request.url);
  const parseStatus = url.searchParams.get('parseStatus') as any;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const result = await getUserFiles(user.id, {
    parseStatus,
    limit,
    offset
  });

  if (result.error) {
    return Response.json(
      createErrorResponse(result.error, ApiErrorCode.INTERNAL_ERROR),
      { status: 500 }
    );
  }

  const page = Math.floor(offset / limit) + 1;
  return Response.json(
    createPaginatedResponse(result.files || [], result.total || 0, page, limit)
  );
}); 