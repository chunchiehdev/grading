import { v4 as uuidv4 } from 'uuid';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { UploadProgressService } from '@/services/progress.server';
import logger from '@/utils/logger';


/**
 * API endpoint to generate a new upload session ID
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with unique upload ID
 */
export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== 'POST') {
      return createApiResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const uploadId = uuidv4();

    try {
      await UploadProgressService.initialize(uploadId);
    } catch (initError) {
      console.warn('初始化上傳進度記錄失敗:', initError);
    }

    logger.info('上傳 ID:', uploadId);
    return createApiResponse({
      success: true,
      uploadId,
    });
  });
}

/**
 * API endpoint loader that rejects GET requests for upload ID creation
 * @returns {Promise<Response>} JSON error response indicating POST method required
 */
export async function loader() {
  return Response.json(
    {
      success: false,
      error: 'use POST to upload ID',
    },
    { status: 405 }
  );
}
