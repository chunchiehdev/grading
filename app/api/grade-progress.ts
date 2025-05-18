import { GradingProgressService } from '@/services/grading-progress.server';

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
            clearInterval(interval);
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
        } catch {}
        clearInterval(interval);
        closed = true;
        controller.close();
      }
    },
    cancel() {
      if (interval) clearInterval(interval);
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}