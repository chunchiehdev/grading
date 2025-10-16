import { RedisProgressService } from '@/services/redis-progress.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * Real-time progress API endpoint for file uploads using Redis
 */
export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');

    if (!uploadId) {
      return Response.json(createErrorResponse('Missing uploadId', ApiErrorCode.VALIDATION_ERROR), { status: 400 });
    }

    // Check if client wants SSE
    const accept = request.headers.get('accept');
    if (accept?.includes('text/event-stream')) {
      // Server-Sent Events for real-time progress
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          const sendProgress = async () => {
            try {
              const progress = await RedisProgressService.getFileProgress(uploadId);
              const stats = await RedisProgressService.getUploadStats(uploadId);

              const data = {
                files: progress,
                stats,
                timestamp: Date.now(),
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

              // Stop streaming if all files are complete or failed
              const allDone = Object.values(progress).every(
                (file) => file.status === 'success' || file.status === 'error'
              );

              if (allDone) {
                controller.enqueue(encoder.encode('event: complete\ndata: done\n\n'));
                controller.close();
                return;
              }

              // Continue streaming every 500ms
              setTimeout(sendProgress, 500);
            } catch (error) {
              logger.error('Progress SSE error:', error);
              controller.error(error);
            }
          };

          sendProgress();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Simple JSON response for one-time progress check
      const progress = await RedisProgressService.getFileProgress(uploadId);
      const stats = await RedisProgressService.getUploadStats(uploadId);

      return Response.json(
        createSuccessResponse({
          files: progress,
          stats,
          timestamp: Date.now(),
        })
      );
    }
  } catch (error) {
    logger.error('Progress API error:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get progress',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
