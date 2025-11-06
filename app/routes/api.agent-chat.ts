/**
 * API Route: Agent Chat
 *
 * Streaming chat endpoint for the learning agent
 * Now using V2 with Gemini's built-in Google Search
 */

import type { ActionFunctionArgs } from 'react-router';
import { createLearningAgentV2Stream } from '@/services/learning-agent-v2.server';
import { getUserId } from '@/services/auth.server';
import { convertToModelMessages, type UIMessage } from 'ai';
import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
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

    // Create streaming agent response (using V2 with built-in Google Search)
    const result = await createLearningAgentV2Stream({
      messages: modelMessages,
      userId,
    });

    // Return UI message stream response (for useChat hook compatibility)
    // IMPORTANT: Set sendSources: true to include sources in the stream!
    return result.toUIMessageStreamResponse({
      sendSources: true, // Enable sources streaming
    });
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
