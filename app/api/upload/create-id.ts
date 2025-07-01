import { v4 as uuidv4 } from 'uuid';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { UploadProgressService } from '@/services/progress.server';
import { getUserId } from '@/services/auth.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

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
    // Debug: log request headers
    console.log('🔍 Request headers:', {
      cookie: request.headers.get('cookie'),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
    });

    // Get user session/ID from existing auth system
    const userId = await getUserId(request);
    console.log('🔍 getUserId result:', { userId, type: typeof userId });
    
    if (!userId) {
      console.warn('⚠️ No userId found - user not authenticated');
      return createApiResponse({ success: false, error: 'Authentication required' }, 401);
    }

    console.log('✅ userId found:', userId);
    
    // Create uploadId with user context
    const uploadId = `${userId}-${uuidv4()}`;
    
    try {
      await UploadProgressService.initialize(uploadId);
    } catch (initError) {
      console.warn('⚠️ 初始化上傳進度記錄失敗:', initError);
    }

    console.log('🎯 上傳 ID 創建完成:', { uploadId, userId });
    return createApiResponse({ uploadId });
  });
}

/**
 * API endpoint loader that rejects GET requests for upload ID creation
 * @returns {Promise<Response>} JSON error response indicating POST method required
 */
export async function loader() {
  return Response.json(
    createErrorResponse('use POST to upload ID', ApiErrorCode.VALIDATION_ERROR),
    { status: 405 }
  );
}
