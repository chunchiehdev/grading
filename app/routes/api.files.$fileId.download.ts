import type { LoaderFunctionArgs } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { getUserId } from '@/services/auth.server';
import { getFile } from '@/services/uploaded-file.server';
import { streamFromStorage } from '@/services/storage.server';
import { createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * GET /api/files/:fileId/download
 * Resource route that streams a file from storage.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // CORS preflight (handle here since resource routes don't have an `options` export)
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

    // Authenticate user
    userId = await getUserId(request);
    if (!userId) {
      logger.warn('File download attempt without authentication', {
        fileId: params.fileId,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return Response.json(createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED), {
        status: 401,
      });
    }

    const fileId = params.fileId;
    if (!fileId) {
      return Response.json(
        createErrorResponse('File ID is required', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 },
      );
    }

    logger.info(`File download request: ${fileId} by user ${userId}`);

    // Get file metadata from database
    const { file, error } = await getFile(fileId, userId);

    if (error || !file) {
      logger.warn(`File not found or access denied: ${fileId}`, {
        userId,
        error,
      });

      return Response.json(
        createErrorResponse('文件不存在或無權訪問', ApiErrorCode.NOT_FOUND),
        { status: 404 },
      );
    }

    // Check if file is soft-deleted
    if (file.isDeleted) {
      logger.warn(`Attempt to access deleted file: ${fileId}`, {
        userId,
        fileName: file.fileName,
      });

      return Response.json(createErrorResponse('文件已被刪除', ApiErrorCode.NOT_FOUND), {
        status: 404,
      });
    }

    // Stream file from storage (Node Readable stream)
    const fileStream = await streamFromStorage(file.fileKey);

    // Prepare response headers
    const headers = new Headers({
      'Content-Type': file.mimeType || fileStream.contentType,
      'Content-Length': file.fileSize.toString(),
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      ETag: fileStream.etag || `"${file.id}"`,
      'Last-Modified': file.updatedAt.toUTCString(),
      // Enable CORS for PDF viewing
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    });

    // Handle range requests for efficient PDF viewing
    const range = request.headers.get('range');
    if (range) {
      const matches = range.match(/bytes=(\d+)-(\d*)/);
      if (matches) {
        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : file.fileSize - 1;
        const chunkSize = end - start + 1;

        headers.set('Content-Range', `bytes ${start}-${end}/${file.fileSize}`);
        headers.set('Content-Length', chunkSize.toString());

        const duration = Date.now() - startTime;
        logger.info(
          `File range streamed successfully: ${fileId} (${start}-${end}/${file.fileSize}) in ${duration}ms`,
          {
            userId,
            fileName: file.fileName,
            fileSize: file.fileSize,
            rangeStart: start,
            rangeEnd: end,
            chunkSize,
          },
        );

        // Convert Node Readable -> Web ReadableStream
        const webStream = createReadableStreamFromReadable(fileStream.stream);
        return new Response(webStream, {
          status: 206, // Partial Content
          headers,
        });
      }
    }

    // Regular full file stream
    const duration = Date.now() - startTime;
    logger.info(
      `File streamed successfully: ${fileId} (${file.fileSize} bytes) in ${duration}ms`,
      {
        userId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      },
    );

    // Convert Node Readable -> Web ReadableStream
    const webStream = createReadableStreamFromReadable(fileStream.stream);
    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('File download error:', {
      error: error instanceof Error ? error.message : error,
      fileId: params.fileId,
      userId,
      duration,
      errorType: typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle storage-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const storageError = error as any;
      if (storageError.type === 'NOT_FOUND') {
        return Response.json(
          createErrorResponse('文件在存儲中不存在', ApiErrorCode.NOT_FOUND),
          { status: 404 },
        );
      }
    }

    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : '文件下載失敗',
        ApiErrorCode.INTERNAL_ERROR,
      ),
      { status: 500 },
    );
  }
}

