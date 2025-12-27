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

    // Create AgentChatSession for analytics tracking
    let sessionId: string | undefined;
    let sessionStartTime = Date.now();
    
    if (userId) {
      try {
        const { db } = await import('@/lib/db.server');
        const session = await db.agentChatSession.create({
          data: {
            userId,
            userRole: userRole || 'STUDENT',
            title: (messages[0] && typeof messages[0].content === 'string') 
              ? messages[0].content.substring(0, 100) 
              : 'Agent Chat',
            status: 'ACTIVE',
          },
        });
        
        sessionId = session.id;
        logger.info('[Agent Chat API] Created session', { sessionId });
        
        // Save initial message to AgentChatMessage
        if (messages.length > 0) {
          await db.agentChatMessage.create({
            data: {
              sessionId: session.id,
              role: 'user',
              content: typeof messages[0].content === 'string' ? messages[0].content : JSON.stringify(messages[0].content),
              timestamp: new Date(),
            },
          });
        }
      } catch (error) {
        logger.warn('[Agent Chat API] Failed to create session', error);
        // Continue without session tracking
      }
    }

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
      sessionId,
    });
    
    try {
      const response = await streamWithGradingAgent(finalUserRole, modelMessages, userId);
      
      // Update session on completion (in background)
      if (sessionId && userId) {
        const executionTime = Date.now() - sessionStartTime;
        const { db } = await import('@/lib/db.server');
        
        // Note: We don't have token info here since it's in the stream
        // Token tracking happens in agent-executor.server.ts for grading
        // For chat, we'll update status and duration
        db.agentChatSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            totalDuration: executionTime,
            lastActivity: new Date(),
          },
        }).catch((err: unknown) => {
          logger.warn('[Agent Chat API] Failed to update session', err);
        });
      }
      
      logger.info('[Agent Chat API] Agent response created successfully');
      return response;
    } catch (streamError) {
      // Update session status to ERROR
      if (sessionId && userId) {
        const { db } = await import('@/lib/db.server');
        db.agentChatSession.update({
          where: { id: sessionId },
          data: {
            status: 'ERROR',
            lastActivity: new Date(),
          },
        }).catch(err => {
          logger.warn('[Agent Chat API] Failed to update session status', err);
        });
      }
      
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
