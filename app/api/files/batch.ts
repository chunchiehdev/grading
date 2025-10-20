/**
 * Batch file details endpoint
 * POST /api/files/batch - Get details for multiple files by IDs
 */

import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(createErrorResponse('Unauthorized', ApiErrorCode.UNAUTHORIZED), { status: 401 });
    }

    const body = await request.json();
    const fileIds = body.fileIds as string[];

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return Response.json(createErrorResponse('fileIds array is required', ApiErrorCode.VALIDATION_ERROR), {
        status: 400,
      });
    }

    // Fetch files that belong to the user and are not deleted
    const files = await db.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        originalFileName: true,
        fileSize: true,
        parseStatus: true,
        parseError: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return Response.json(createSuccessResponse({ files }));
  } catch (error) {
    console.error('Batch file fetch error:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch files',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
