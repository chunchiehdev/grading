import type { LoaderFunctionArgs } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { requireAuthForApi } from '@/services/auth.server';
import { getPostById, canAccessCourse } from '@/services/coursePost.server';
import { streamFromStorage } from '@/services/storage.server';
import { db } from '@/lib/db.server';
import { createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

interface PostAttachment {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * GET /api/posts/:postId/attachments/:fileId/download
 * Downloads an attachment from a course post.
 * 
 * Authorization: User must have access to the course (teacher or enrolled student)
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const startTime = Date.now();

  try {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Authenticate user (returns null instead of redirect for API routes)
    const user = await requireAuthForApi(request);
    if (!user) {
      return Response.json(
        createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED),
        { status: 401 }
      );
    }

    const { postId, fileId } = params;

    if (!postId || !fileId) {
      return Response.json(
        createErrorResponse('Post ID and File ID are required', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 }
      );
    }

    // Get post and verify it exists
    const post = await getPostById(postId);
    if (!post) {
      return Response.json(
        createErrorResponse('貼文不存在', ApiErrorCode.NOT_FOUND),
        { status: 404 }
      );
    }

    // Check user has access to the course
    const hasAccess = await canAccessCourse(user.id, post.courseId);
    if (!hasAccess) {
      logger.warn('Unauthorized attachment download attempt', {
        userId: user.id,
        postId,
        fileId,
        courseId: post.courseId,
      });
      return Response.json(
        createErrorResponse('無權訪問此課程附件', ApiErrorCode.FORBIDDEN),
        { status: 403 }
      );
    }

    // Find the attachment in the post
    const attachments = post.attachments as PostAttachment[] | null;
    if (!attachments || attachments.length === 0) {
      return Response.json(
        createErrorResponse('此貼文沒有附件', ApiErrorCode.NOT_FOUND),
        { status: 404 }
      );
    }

    const attachment = attachments.find((a) => a.fileId === fileId);
    if (!attachment) {
      return Response.json(
        createErrorResponse('附件不存在', ApiErrorCode.NOT_FOUND),
        { status: 404 }
      );
    }

    // Get the uploaded file record from database
    const uploadedFile = await db.uploadedFile.findUnique({
      where: { id: fileId },
    });

    if (!uploadedFile) {
      logger.error('Attachment file record not found in database', {
        fileId,
        postId,
      });
      return Response.json(
        createErrorResponse('附件文件記錄不存在', ApiErrorCode.NOT_FOUND),
        { status: 404 }
      );
    }

    logger.info(`Post attachment download: ${fileId} by user ${user.id}`, {
      postId,
      fileName: attachment.fileName,
    });

    // Stream file from storage
    const fileStream = await streamFromStorage(uploadedFile.fileKey);

    // Determine if file should be displayed inline or downloaded
    const isInlineViewable = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
      attachment.mimeType
    );
    const disposition = isInlineViewable ? 'inline' : 'attachment';

    // Prepare response headers
    const headers = new Headers({
      'Content-Type': attachment.mimeType || fileStream.contentType,
      'Content-Length': fileStream.contentLength.toString(),
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
      ETag: fileStream.etag || `"${fileId}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Accept-Ranges': 'none', // Indicate we don't support range requests
    });

    if (fileStream.lastModified) {
      headers.set('Last-Modified', fileStream.lastModified.toUTCString());
    }

    // Stream full file (range requests not supported for now)
    const duration = Date.now() - startTime;
    logger.info(`Post attachment streamed: ${fileId} (${fileStream.contentLength} bytes) in ${duration}ms`, {
      userId: user.id,
      postId,
      fileName: attachment.fileName,
    });

    const webStream = createReadableStreamFromReadable(fileStream.stream);
    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Post attachment download error:', {
      error: error instanceof Error ? error.message : error,
      postId: params.postId,
      fileId: params.fileId,
      duration,
    });

    // Handle storage-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const storageError = error as Record<string, unknown>;
      if (storageError.type === 'NOT_FOUND') {
        return Response.json(
          createErrorResponse('附件文件不存在', ApiErrorCode.NOT_FOUND),
          { status: 404 }
        );
      }
    }

    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : '附件下載失敗',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
