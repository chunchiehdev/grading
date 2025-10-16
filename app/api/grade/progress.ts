import { GradingProgressService } from '@/services/grading-progress.server';

/**
 * API endpoint for Server-Sent Events (SSE) grading progress stream
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object with gradingId query parameter
 * @returns {Promise<Response>} SSE stream with real-time grading progress updates
 */
export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const gradingId = url.searchParams.get('gradingId');
  if (!gradingId) {
    return new Response('gradingId is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = async () => {
        if (closed) return;
        const progress = await GradingProgressService.getProgress(gradingId);
        if (progress) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
          } catch (e) {
            console.error('[grade/progress] Failed to enqueue progress data:', e);
            clearInterval(interval);
            closed = true;
            try {
              controller.close();
            } catch (closeError) {
              console.error('[grade/progress] Failed to close controller:', closeError);
            }
            return;
          }
          if (progress.phase === 'completed' || progress.phase === 'error') {
            clearInterval(interval);
            closed = true;
            controller.close();
          }
        }
      };

      try {
        await sendProgress();
        interval = setInterval(sendProgress, 1000);
      } catch (error) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ phase: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            )
          );
        } catch (encodingError) {
          console.error('[grade/progress] Failed to encode error message:', encodingError);
        }
        clearInterval(interval);
        closed = true;
        controller.close();
      }
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
