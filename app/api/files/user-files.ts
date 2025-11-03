import { getUserFiles } from '@/services/uploaded-file.server';
import { createPaginatedResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import { withAuth } from '@/middleware/api.server';
import { FileParseStatus } from '@/types/database';

/**
 * API endpoint to get user's uploaded files with parsing status
 * @param {Object} params - Route parameters including authenticated user
 * @param {Request} params.request - HTTP request object
 * @param {Object} params.user - Authenticated user object
 * @returns {Promise<Response>} JSON response with user's files
 */

export const loader = withAuth(async ({ request, user }) => {
  const url = new URL(request.url);
  const parseStatusParam = url.searchParams.get('parseStatus');
  // Map web API status names to Prisma enum values
  const statusMap: Record<string, FileParseStatus> = {
    'PENDING': 'PENDING',
    'SUCCESS': 'COMPLETED',  // Map SUCCESS to COMPLETED
    'FAILED': 'FAILED',
  };
  const parseStatus: FileParseStatus | null = parseStatusParam && parseStatusParam in statusMap
    ? statusMap[parseStatusParam]
    : null;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const result = await getUserFiles(user.id, {
    parseStatus,
    limit,
    offset,
  });

  if (result.error) {
    return Response.json(createErrorResponse(result.error, ApiErrorCode.INTERNAL_ERROR), { status: 500 });
  }

  const page = Math.floor(offset / limit) + 1;
  return Response.json(createPaginatedResponse(result.files || [], result.total || 0, page, limit));
});
