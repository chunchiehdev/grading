import { type ActionFunctionArgs } from 'react-router';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { redis } from '@/lib/redis';
import { type BridgeEvent } from '@/types/bridge';
import { randomUUID } from 'node:crypto';
import { getUserId } from '@/services/auth.server';
import { getGradingSession } from '@/services/grading-session.server';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  // Vercel AI SDK v5/v6 puts the extra body data in the root of the JSON object
  // when using { body: { data: ... } } in sendMessage
  const data = json.data;

  // sessionId is required because the grading job is created elsewhere.
  if (!data?.sessionId || typeof data.sessionId !== 'string') {
    console.error('Bridge Error: Missing sessionId', { json });
    return new Response('Missing sessionId', { status: 400 });
  }

  const sessionId = data.sessionId;

  const sessionResult = await getGradingSession(sessionId, userId);
  if (!sessionResult.session) {
    console.warn(`[Bridge] Forbidden subscription attempt for session: ${sessionId}, user: ${userId}`);
    return new Response('Forbidden', { status: 403 });
  }

  console.log(`[Bridge] Request received for session: ${sessionId}, user: ${userId}`);

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

        // spec 020: multi-provider streams use the provider name as text id so the
        // frontend can demux into separate tabs. Legacy single-mode keeps using a random UUID.
        const legacyTextId = randomUUID();
        // Streams that have been opened with text-start but NOT yet closed with text-end.
        // CRITICAL: heartbeat must only write to streams in this set; writing to a closed
        // stream throws AI_UIMessageStreamError on the client side.
        const activeStreams = new Set<string>();

        // Resolve which text-stream id a given event belongs to.
        const resolveId = (provider?: string): string => (provider ? provider : legacyTextId);

        // spec 020: TextUIPart on the frontend does NOT expose the chunk `id`,
        // so we piggy-back the provider tag through `providerMetadata.multimodel.provider`.
        // The frontend reads part.providerMetadata?.multimodel?.provider to demux into tabs.
        const metaFor = (provider?: string) => (provider ? { multimodel: { provider } } : undefined);

        const startIfNeeded = (id: string, provider?: string) => {
          if (!activeStreams.has(id)) {
            console.log(`[Bridge] Starting text stream id=${id} provider=${provider ?? 'default'}`);
            writer.write({ type: 'text-start', id, providerMetadata: metaFor(provider) });
            activeStreams.add(id);
          }
        };

        const endStream = (id: string) => {
          if (activeStreams.has(id)) {
            writer.write({ type: 'text-end', id });
            activeStreams.delete(id);
          }
        };

        return new Promise<void>((resolve) => {
          // Heartbeat to keep connection alive (every 15 seconds).
          // Picks any still-active stream; skips silently if all streams have ended.
          const heartbeat = setInterval(() => {
            const iter = activeStreams.values().next();
            if (!iter.done) {
              writer.write({ type: 'text-delta', id: iter.value, delta: '' });
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
              console.log(
                `[Bridge] Received Redis message on ${channel}:`,
                message.substring(0, 100) + (message.length > 100 ? '...' : '')
              );
              const event = JSON.parse(message) as BridgeEvent;

              switch (event.type) {
                case 'text-delta': {
                  const id = resolveId(event.provider);
                  startIfNeeded(id, event.provider);
                  writer.write({
                    type: 'text-delta',
                    id,
                    delta: event.content || '',
                    providerMetadata: metaFor(event.provider),
                  });
                  break;
                }

                case 'tool-call':
                  console.log(
                    `[Bridge] Writing tool-input-available: ${event.toolName} provider=${event.provider ?? 'default'}`
                  );
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

                case 'error': {
                  console.error(
                    `[Bridge] Received error event provider=${event.provider ?? 'default'}: ${event.error}`
                  );
                  const id = resolveId(event.provider);
                  startIfNeeded(id, event.provider);
                  writer.write({
                    type: 'text-delta',
                    id,
                    delta: `\n\n[Error: ${event.error}]`,
                    providerMetadata: metaFor(event.provider),
                  });
                  // spec 020: per-provider error doesn't end the stream — other providers may still be running.
                  // Legacy single-mode (no provider tag) still cleans up to preserve old behaviour.
                  if (!event.provider) {
                    cleanup();
                  }
                  break;
                }

                case 'finish': {
                  // spec 020: per-provider finish ends only that provider's text stream.
                  // The real end-of-job signal is `aggregate-finish` from parallel-agents.
                  const id = resolveId(event.provider);
                  endStream(id);
                  if (!event.provider) {
                    // Legacy single-mode: a single finish ends the whole job.
                    writer.write({ type: 'finish', messageMetadata: { sessionId } });
                    cleanup();
                  } else {
                    console.log(`[Bridge] Provider ${event.provider} finished; awaiting aggregate-finish`);
                  }
                  break;
                }

                case 'aggregate-finish':
                  console.log(`[Bridge] Aggregate finish; closing all open streams and ending message`);
                  for (const id of Array.from(activeStreams)) {
                    endStream(id);
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
