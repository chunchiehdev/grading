import { type ActionFunctionArgs } from 'react-router';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { redis } from '@/lib/redis';
import { type BridgeEvent } from '@/types/bridge';
import { randomUUID } from 'node:crypto';

export async function action({ request }: ActionFunctionArgs) {
  const json = await request.json();
  const { messages } = json;
  // Vercel AI SDK v5/v6 puts the extra body data in the root of the JSON object
  // when using { body: { data: ... } } in sendMessage
  const data = json.data;
  
  // Validate required data
  // We only strictly need userId for auth/logging context
  // sessionId is used for Redis subscription
  if (!data?.userId) {
    console.error('Bridge Error: Missing userId', { json });
    return new Response('Missing userId', { status: 400 });
  }

  const sessionId = data.sessionId || randomUUID();
  
  console.log(`[Bridge] Request received for session: ${sessionId}, user: ${data?.userId}`);

  // Note: We do NOT add the job to the queue here anymore.
  // The job is added by the startGradingSession call in the session API.
  // This bridge only serves to stream the updates from Redis.

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        console.log(`[Bridge] Stream execution started for session: ${sessionId}`);
        const sub = redis.duplicate();
        await sub.subscribe(`session:${sessionId}`);
        console.log(`[Bridge] Subscribed to Redis channel: session:${sessionId}`);
        
        const textId = randomUUID();
        let hasStartedText = false;

        return new Promise<void>((resolve) => {
          // Heartbeat to keep connection alive (every 15 seconds)
          const heartbeat = setInterval(() => {
            // Send empty delta to keep connection alive
            if (hasStartedText) {
                // console.log(`[Bridge] Sending heartbeat for session: ${sessionId}`);
                writer.write({ type: 'text-delta', id: textId, delta: '' });
            }
          }, 15000);

          const cleanup = async () => {
            console.log(`[Bridge] Cleaning up stream for session: ${sessionId}`);
            clearInterval(heartbeat);
            
            // Properly handle Redis cleanup with error catching
            try {
              await sub.unsubscribe();
              await sub.quit();
            } catch (error) {
              // Non-critical error - Redis might already be disconnected
              console.warn(`[Bridge] Redis cleanup warning (non-critical):`, error);
            }
            
            resolve();
          };

          sub.on('message', (channel, message) => {
            try {
              console.log(`[Bridge] Received Redis message on ${channel}:`, message.substring(0, 100) + (message.length > 100 ? '...' : ''));
              const event = JSON.parse(message) as BridgeEvent;

              switch (event.type) {
                case 'text-delta':
                  if (!hasStartedText) {
                    console.log(`[Bridge] Starting text stream (text-start)`);
                    writer.write({ type: 'text-start', id: textId });
                    hasStartedText = true;
                  }
                  // console.log(`[Bridge] Writing text-delta: ${event.content?.substring(0, 20)}...`);
                  writer.write({ type: 'text-delta', id: textId, delta: event.content || '' });
                  break;
                
                case 'tool-call':
                  console.log(`[Bridge] Writing tool-input-available: ${event.toolName}`);
                  writer.write({
                    type: 'tool-input-available',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    input: event.args,
                  });
                  break;

                case 'tool-result':
                  console.log(`[Bridge] Writing tool-output-available: ${event.toolCallId}`);
                  writer.write({
                    type: 'tool-output-available',
                    toolCallId: event.toolCallId,
                    output: event.result,
                  });
                  break;
                  
                case 'error':
                  console.error(`[Bridge] Received error event: ${event.error}`);
                  if (!hasStartedText) {
                    writer.write({ type: 'text-start', id: textId });
                    hasStartedText = true;
                  }
                  writer.write({ type: 'text-delta', id: textId, delta: `\n\n[Error: ${event.error}]` });
                  cleanup();
                  break;

                case 'finish':
                  console.log(`[Bridge] Received finish event`);
                  if (hasStartedText) {
                    writer.write({ type: 'text-end', id: textId });
                  }
                  writer.write({ type: 'finish', messageMetadata: { sessionId } });
                  cleanup();
                  break;
                  
                default:
                   console.warn(`[Bridge] Unknown event type: ${(event as any).type}`);
              }
            } catch (e) {
              console.error(`[Bridge] Error processing message:`, e);
            }
          });
          
          // Safety timeout (10 minutes)
          setTimeout(() => {
              cleanup();
          }, 600000);
        });
      },
    }),
  });
}
