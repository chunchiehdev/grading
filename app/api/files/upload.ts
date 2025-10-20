/**
 * Simple file upload endpoint for reference materials
 * POST /api/files/upload - Upload a single file
 */

import { getUserId } from '@/services/auth.server';
import { uploadFile } from '@/services/uploaded-file.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json(createErrorResponse('No file provided', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      return Response.json(
        createErrorResponse('Invalid file type. Only PDF, DOCX, and TXT are allowed', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 }
      );
    }

    // Upload using the service
    const result = await uploadFile({
      userId,
      file,
      originalFileName: file.name,
    });

    if (!result.success) {
      return Response.json(createErrorResponse(result.error || 'Upload failed', ApiErrorCode.INTERNAL_ERROR), {
        status: 500,
      });
    }

    return Response.json(
      createSuccessResponse({
        fileId: result.fileId,
        fileName: file.name,
        fileSize: file.size,
      })
    );
  } catch (error) {
    console.error('File upload error:', error);
    return Response.json(
      createErrorResponse(error instanceof Error ? error.message : 'Upload failed', ApiErrorCode.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}
