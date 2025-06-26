import { getUserId } from '@/services/auth.server';
import { getUserFiles, deleteFile, restoreFile } from '@/services/uploaded-file.server';
import { FileParseStatus } from '@/types/database';

/**
 * GET: List user files with optional filtering
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
      offset
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      files: result.files,
      total: result.total
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to list files'
    }, { status: 500 });
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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const method = request.method;
    const formData = await request.formData();
    const fileId = formData.get('fileId') as string;

    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 });
    }

    if (method === 'DELETE') {
      const result = await deleteFile(fileId, userId);

      if (!result.success) {
        return Response.json({ error: result.error }, { status: 400 });
      }

      return Response.json({ 
        success: true, 
        message: `File ${result.deletionType === 'soft' ? 'hidden' : 'permanently deleted'} successfully`,
        deletionType: result.deletionType
      });
    } else if (method === 'PUT') {
      // 恢復刪除的檔案
      const result = await restoreFile(fileId, userId);

      if (!result.success) {
        return Response.json({ error: result.error }, { status: 400 });
      }

      return Response.json({ success: true, message: 'File restored successfully' });
    } else {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to process request'
    }, { status: 500 });
  }
}