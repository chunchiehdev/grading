import { deleteFromStorage } from '@/services/storage.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'DELETE') {
    return Response.json(createErrorResponse('Method not allowed', ApiErrorCode.VALIDATION_ERROR), { status: 405 });
  }

  try {
    const { key } = await request.json();

    if (!key) {
      return Response.json(createErrorResponse('File key is required', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    await deleteFromStorage(key);

    return Response.json(createSuccessResponse({}));
  } catch (error) {
    console.error('Failed to delete file:', error);
    return Response.json(createErrorResponse('Failed to delete file', ApiErrorCode.INTERNAL_ERROR), { status: 500 });
  }
}
