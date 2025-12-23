import type { LoaderFunctionArgs } from 'react-router';
import { Redis } from 'ioredis';
import { REDIS_CONFIG } from '@/config/redis';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { sessionId } = params;
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const redis = new Redis(REDIS_CONFIG);
      const channel = `session:${sessionId}`;
      
      console.log(`[SSE] Client connected to ${channel}`);

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', content: 'Connection established' })}\n\n`));

      // Heartbeat to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          clearInterval(interval);
          redis.disconnect();
        }
      }, 15000);

      redis.subscribe(channel, (err) => {
        if (err) {
          console.error('[SSE] Redis subscribe error:', err);
          controller.error(err);
        }
      });

      redis.on('message', (ch, message) => {
        if (ch === channel) {
          // Send data in SSE format: "data: ...\n\n"
          const data = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      });

      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from ${channel}`);
        clearInterval(interval);
        redis.disconnect();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
