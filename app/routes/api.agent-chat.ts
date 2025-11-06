/**
 * API Route: Agent Chat
 *
 * Streaming chat endpoint for the learning agent
 */

import type { ActionFunctionArgs } from 'react-router';
import { createLearningAgentStream } from '@/services/learning-agent.server';
import { getUserId } from '@/services/auth.server';
import { convertToModelMessages, type UIMessage } from 'ai';
import logger from '@/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get user ID (optional - agent works without auth)
    let userId: string | undefined = undefined;
    try {
      const id = await getUserId(request);
      userId = id || undefined;
    } catch {
      // Guest mode - no auth required
      userId = undefined;
    }

    // Parse request body
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    logger.info('[Agent Chat API] Processing chat request', {
      userId,
      messageCount: messages.length,
    });

    // Convert UIMessages to ModelMessages
    // useChat sends UIMessage[] format, but streamText expects ModelMessage[]
    const modelMessages = convertToModelMessages(messages as UIMessage[]);

    // Create streaming agent response
    const result = await createLearningAgentStream({
      messages: modelMessages,
      userId,
    });

    // Return UI message stream response (for useChat hook compatibility)
    // toUIMessageStreamResponse() is specifically designed for useChat hook
    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error('[Agent Chat API] Error processing chat', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
