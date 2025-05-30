import { getUserId } from '@/services/auth.server';
import { getUserFiles } from '@/services/uploaded-file.server';

/**
 * API endpoint to get user's uploaded files with parsing status
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with user's files
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parseStatus = url.searchParams.get('parseStatus') as any;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await getUserFiles(userId, {
      parseStatus,
      limit,
      offset
    });

    if (result.error) {
      return Response.json({ success: false, error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      files: result.files,
      total: result.total
    });
  } catch (error) {
    console.error('Failed to get user files:', error);
    return Response.json(
      { success: false, error: 'Failed to get user files' },
      { status: 500 }
    );
  }
} 