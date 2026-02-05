import type { LoaderFunctionArgs } from 'react-router';
import { streamFromStorage } from '@/services/storage.server';
import logger from '@/utils/logger';

/**
 * API route to proxy files from MinIO storage
 * This allows browsers to access files without needing direct MinIO access
 * 
 * Usage: /api/files/covers%2FcourseId%2Fimage.jpg (URL encoded key)
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { key } = params;

  if (!key) {
    return new Response('File key is required', { status: 400 });
  }

  // Decode the URL-encoded key
  const decodedKey = decodeURIComponent(key);

  try {
    const result = await streamFromStorage(decodedKey);

    // Convert readable stream to web stream
    const webStream = new ReadableStream({
      start(controller) {
        result.stream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        result.stream.on('end', () => {
          controller.close();
        });
        result.stream.on('error', (err: Error) => {
          controller.error(err);
        });
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(result.contentLength && { 'Content-Length': result.contentLength.toString() }),
        ...(result.etag && { 'ETag': result.etag }),
      },
    });
  } catch (error) {
    logger.error({ error, key: decodedKey }, 'Failed to stream file');
    return new Response('Failed to retrieve file', { status: 500 });
  }
}
