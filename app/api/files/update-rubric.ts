import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/** 
 * 這功能已被重新設計
 * 檔案與評分標準的關聯現在透過 GradingSession/GradingResult 來處理
 * 此 API 保留作為向後相容，但建議使用新的評分會話 API
 */
export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        createErrorResponse('Authentication required', ApiErrorCode.UNAUTHORIZED), 
        { status: 401 }
      );
    }

    const { fileId, rubricId } = await request.json();

    if (!fileId) {
      return Response.json(
        createErrorResponse('File ID is required', ApiErrorCode.VALIDATION_ERROR), 
        { status: 400 }
      );
    }

    // Verify file belongs to user
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return Response.json(
        createErrorResponse('File not found or access denied', ApiErrorCode.NOT_FOUND), 
        { status: 404 }
      );
    }

    return Response.json(
      createSuccessResponse({
        message: 'File found. Please use grading session API to associate files with rubrics.',
        file: {
          id: file.id,
          fileName: file.fileName,
          parseStatus: file.parseStatus,
        },
        suggestion: {
          useNewAPI: '/api/grading-sessions',
          rubricId: rubricId,
        }
      })
    );
  });
} 