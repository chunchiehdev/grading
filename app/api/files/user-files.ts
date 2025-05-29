import { getUserId } from '@/services/auth.server';
import { getUserUploadedFiles } from '@/services/pdf-parser.server';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';

/**
 * API endpoint to get user's uploaded files with parsing status
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with user's files
 */
export async function loader({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');

    const files = await getUserUploadedFiles(userId, uploadId || undefined);

    return createApiResponse({ files });
  });
} 