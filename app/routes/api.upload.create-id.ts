import { v4 as uuidv4 } from 'uuid';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { UploadProgressService } from '@/services/progress.server';

/**
 * get new id
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

    console.log('生成新的上傳 ID:', uploadId);

    return createApiResponse({
      success: true,
      uploadId,
    });
  });
}

/**
 *
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
