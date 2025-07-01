import { getUserId } from '@/services/auth.server';
import { createGradingSession, startGradingSession } from '@/services/grading-session.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * API endpoint to start grading using the new grading session system
 * This endpoint now creates a grading session and starts the grading process
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request with form data containing fileIds and rubricIds
 * @returns {Promise<Response>} JSON response with session ID or error
 */
export async function action({ request }: { request: Request }) {
  try {
    // Get user ID from session
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED), 
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const fileIds = JSON.parse(formData.get('fileIds') as string || '[]');
    const rubricIds = JSON.parse(formData.get('rubricIds') as string || '[]');

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return Response.json(
        createErrorResponse('至少需要選擇一個檔案', ApiErrorCode.VALIDATION_ERROR), 
        { status: 400 }
      );
    }

    if (!Array.isArray(rubricIds) || rubricIds.length === 0) {
      return Response.json(
        createErrorResponse('至少需要選擇一個評分標準', ApiErrorCode.VALIDATION_ERROR), 
        { status: 400 }
      );
    }

    // Create grading session
    const sessionResult = await createGradingSession({
      userId,
      filePairs: fileIds.map((fileId: string, index: number) => ({
        fileId,
        rubricId: rubricIds[index]
      }))
    });

    if (!sessionResult.success) {
      return Response.json(
        createErrorResponse(sessionResult.error || 'Failed to create session', ApiErrorCode.INTERNAL_ERROR), 
        { status: 400 }
      );
    }

    // Start grading process
    const startResult = await startGradingSession(sessionResult.sessionId!, userId);
    
    if (!startResult.success) {
      return Response.json(
        createErrorResponse(startResult.error || 'Failed to start grading', ApiErrorCode.INTERNAL_ERROR), 
        { status: 500 }
      );
    }

    return Response.json(
      createSuccessResponse({
        sessionId: sessionResult.sessionId,
        message: '評分會話已建立並開始處理'
      })
    );
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : '評分過程中發生錯誤',
        ApiErrorCode.INTERNAL_ERROR
      ), 
      { status: 500 }
    );
  }
} 