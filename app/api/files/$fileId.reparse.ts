/**
 * Retry file parsing endpoint
 * POST /api/files/:fileId/reparse - Retry parsing a failed file
 */

import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

export async function action({ request, params }: { request: Request; params: any }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const fileId = params.fileId;
    if (!fileId) {
      return Response.json(createErrorResponse('File ID required', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    // Check file exists and belongs to user
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
        isDeleted: false,
      },
    });

    if (!file) {
      return Response.json(createErrorResponse('File not found', ApiErrorCode.NOT_FOUND), { status: 404 });
    }

    // Reset parse status - background worker will pick it up
    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        parseStatus: 'PENDING',
        parseError: null,
        parsedContent: null,
      },
    });

    return Response.json(
      createSuccessResponse({
        message: 'File parse retry initiated',
        fileId,
      })
    );
  } catch (error) {
    console.error('File reparse error:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to retry parse',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}

