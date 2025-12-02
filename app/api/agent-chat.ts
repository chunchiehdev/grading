/**
 * API Route: Agent Chat
 *
 * Streaming chat endpoint for the grading agent
 * Using V3 with official Vercel AI SDK Agent class for production-grade agent management
 */

import type { ActionFunctionArgs } from 'react-router';
import { streamWithGradingAgent } from '@/lib/grading-agent-v3.server';
import { getUserId } from '@/services/auth.server';
import { convertToModelMessages, type UIMessage } from 'ai';
import logger from '@/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get user ID and role (optional - agent works without auth)
    let userId: string | undefined = undefined;
    let userRole: 'STUDENT' | 'TEACHER' | undefined = undefined;
    try {
      const id = await getUserId(request);
      userId = id || undefined;

      // Fetch user role if authenticated
      if (userId) {
        const { db } = await import('@/lib/db.server');
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });
        userRole = user?.role as 'STUDENT' | 'TEACHER' | undefined;
      }
    } catch {
      // Guest mode - no auth required
      userId = undefined;
      userRole = undefined;
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
      userRole,
      messageCount: messages.length,
    });

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages as UIMessage[]);
    
    logger.debug('[Agent Chat API] Converted messages', {
      modelMessageCount: modelMessages.length,
      roles: modelMessages.map(m => m.role),
    });

    // Create streaming agent response (using V3 with Agent class)
    const finalUserRole = userRole || 'STUDENT';
    logger.info('[Agent Chat API] Creating agent stream', {
      userRole: finalUserRole,
      hasUserId: !!userId,
    });
    
    try {
      const response = await streamWithGradingAgent(finalUserRole, modelMessages, userId);
      logger.info('[Agent Chat API] Agent response created successfully');
      return response;
    } catch (streamError) {
      logger.error('[Agent Chat API] Error creating stream', {
        error: streamError instanceof Error ? streamError.message : String(streamError),
        stack: streamError instanceof Error ? streamError.stack : undefined,
      });
      throw streamError;
    }
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
