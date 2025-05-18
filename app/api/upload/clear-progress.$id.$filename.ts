import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { UploadProgressService } from '@/services/progress.server';

export async function action({ params, request }: { params: { id: string; filename: string }; request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== 'DELETE') {
      return createApiResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const { id, filename } = params;

    if (!id || !filename) {
      return createApiResponse({ success: false, error: 'Missing required parameters' }, 400);
    }

    await UploadProgressService.clearFileProgress(id, decodeURIComponent(filename));

    return createApiResponse({
      success: true,
      message: 'File progress cleared successfully',
    });
  });
}
