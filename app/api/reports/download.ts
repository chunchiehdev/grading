import type { LoaderFunctionArgs } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { getUserId } from '@/services/auth.server';
import { streamFromStorage } from '@/services/storage.server';
import { createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * GET /api/reports/download?key=reports/userId/filename.pdf
 * Resource route that streams a generated report from storage.
 *
 * This is specifically for AI-generated reports that don't have database records.
 * Only allows downloading reports from the authenticated user's folder.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const startTime = Date.now();
  let userId: string | null = null;

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

    // Authenticate user
    userId = await getUserId(request);
    if (!userId) {
      logger.warn({
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      }, 'Report download attempt without authentication');

      return Response.json(createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED), {
        status: 401,
      });
    }

    // Get storage key from query parameter
    const url = new URL(request.url);
    const storageKey = url.searchParams.get('key');

    if (!storageKey) {
      return Response.json(createErrorResponse('Storage key is required', ApiErrorCode.VALIDATION_ERROR), {
        status: 400,
      });
    }

    // Security: Verify the storage key is in the user's reports folder
    const expectedPrefix = `reports/${userId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      logger.warn({
        userId,
        requestedKey: storageKey,
        expectedPrefix,
      }, 'Unauthorized report download attempt');

      return Response.json(createErrorResponse('無權訪問此報告', ApiErrorCode.FORBIDDEN), {
        status: 403,
      });
    }

    logger.info(`Report download request: ${storageKey} by user ${userId}`);

    // Stream file from storage
    const fileStream = await streamFromStorage(storageKey);

    // Extract filename from storage key
    const fileName = storageKey.split('/').pop() || 'report.pdf';

    // Prepare response headers
    const headers = new Headers({
      'Content-Type': fileStream.contentType,
      'Content-Length': fileStream.contentLength.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      ETag: fileStream.etag || `"${storageKey}"`,
      // Enable CORS for PDF viewing
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    });

    if (fileStream.lastModified) {
      headers.set('Last-Modified', fileStream.lastModified.toUTCString());
    }

    // Handle range requests for efficient PDF viewing
    const range = request.headers.get('range');
    if (range) {
      const matches = range.match(/bytes=(\d+)-(\d*)/);
      if (matches) {
        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : fileStream.contentLength - 1;
        const chunkSize = end - start + 1;

        headers.set('Content-Range', `bytes ${start}-${end}/${fileStream.contentLength}`);
        headers.set('Content-Length', chunkSize.toString());

        const duration = Date.now() - startTime;
        logger.info({
          userId,
          fileName,
          fileSize: fileStream.contentLength,
          rangeStart: start,
          rangeEnd: end,
          chunkSize,
        }, `Report range streamed successfully: ${storageKey} (${start}-${end}/${fileStream.contentLength}) in ${duration}ms`);

        const webStream = createReadableStreamFromReadable(fileStream.stream);
        return new Response(webStream, {
          status: 206, // Partial Content
          headers,
        });
      }
    }

    // Regular full file stream
    const duration = Date.now() - startTime;
    logger.info({
      userId,
      fileName,
      fileSize: fileStream.contentLength,
      contentType: fileStream.contentType,
    }, `Report streamed successfully: ${storageKey} (${fileStream.contentLength} bytes) in ${duration}ms`);

    const webStream = createReadableStreamFromReadable(fileStream.stream);
    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      error: error instanceof Error ? error.message : error,
      userId,
      duration,
      errorType: typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Report download error:');

    // Handle storage-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const storageError = error as Record<string, unknown>;
      if (storageError.type === 'NOT_FOUND') {
        return Response.json(createErrorResponse('報告文件不存在或已過期', ApiErrorCode.NOT_FOUND), { status: 404 });
      }
    }

    return Response.json(
      createErrorResponse(error instanceof Error ? error.message : '報告下載失敗', ApiErrorCode.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}
