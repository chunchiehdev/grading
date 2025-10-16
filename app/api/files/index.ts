import { getUserId } from '@/services/auth.server';
import { getUserFiles, deleteFile, restoreFile } from '@/services/uploaded-file.server';
import { FileParseStatus } from '@/types/database';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, ApiErrorCode } from '@/types/api';

/**
 * GET: List user files with optional filtering
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const url = new URL(request.url);
    const parseStatus = url.searchParams.get('parseStatus') as FileParseStatus | null;
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await getUserFiles(userId, {
      parseStatus: parseStatus || undefined,
      includeDeleted,
      limit,
      offset,
    });

    if (result.error) {
      return Response.json(createErrorResponse(result.error, ApiErrorCode.INTERNAL_ERROR), { status: 500 });
    }

    const page = Math.floor(offset / limit) + 1;
    return Response.json(createPaginatedResponse(result.files || [], result.total || 0, page, limit));
  } catch (error) {
    return Response.json(
      createErrorResponse(error instanceof Error ? error.message : 'Failed to list files', ApiErrorCode.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}

/**
 * DELETE: Soft delete a user file
 * PUT: Restore a soft-deleted file
 */
export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const method = request.method;
    const formData = await request.formData();
    const fileId = formData.get('fileId') as string;

    if (!fileId) {
      return Response.json(createErrorResponse('File ID is required', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    if (method === 'DELETE') {
      const result = await deleteFile(fileId, userId);

      if (!result.success) {
        return Response.json(
          createErrorResponse(result.error || 'Failed to delete file', ApiErrorCode.INTERNAL_ERROR),
          { status: 400 }
        );
      }

      return Response.json(
        createSuccessResponse({
          message: `File ${result.deletionType === 'soft' ? 'hidden' : 'permanently deleted'} successfully`,
          deletionType: result.deletionType,
        })
      );
    } else if (method === 'PUT') {
      const result = await restoreFile(fileId, userId);

      if (!result.success) {
        return Response.json(
          createErrorResponse(result.error || 'Failed to restore file', ApiErrorCode.INTERNAL_ERROR),
          { status: 400 }
        );
      }

      return Response.json(createSuccessResponse({ message: 'File restored successfully' }));
    } else {
      return Response.json(createErrorResponse('Method not allowed', ApiErrorCode.VALIDATION_ERROR), { status: 405 });
    }
  } catch (error) {
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to process request',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
