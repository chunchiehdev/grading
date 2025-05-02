export async function loader({ request }: { request: Request }) {
  // Set up SSE stream
  const stream = new ReadableStream({
    start(controller) {
      let count = 0;

      // Send initial count
      controller.enqueue(`event: counter\ndata: ${count}\n\n`);

      // Increment count every second
      const interval = setInterval(() => {
        count++;
        controller.enqueue(`event: counter\ndata: ${count}\n\n`);
      }, 1000);

      // Cleanup after 5 minutes
      setTimeout(
        () => {
          clearInterval(interval);
          controller.close();
        },
        5 * 60 * 1000
      );
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
