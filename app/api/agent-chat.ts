/**
 * API Route: Agent Chat
 *
 * Streaming chat endpoint for the grading agent
 * Using V3 with official Vercel AI SDK Agent class for production-grade agent management
 */

import type { ActionFunctionArgs } from 'react-router';
import { streamWithGradingAgent } from '@/lib/grading-agent-v3.server';
import { getUserId } from '@/services/auth.server';
import { type UIMessage } from 'ai';
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

    // Parse model preference from cookie early
    const cookieHeader = request.headers.get('Cookie');
    let modelProvider: 'gemini' | 'local' | 'auto' = 'auto'; // Default
    
    if (cookieHeader) {
      const match = cookieHeader.match(/ai-model-provider=(gemini|local|auto)/);
      if (match) {
        modelProvider = match[1] as any;
      }
    }

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
      modelProviderPreference: modelProvider,
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
            modelProvider: modelProvider, // Save initial preference (e.g. 'auto', 'local')
          },
        });
        
        sessionId = session.id;
        logger.info('[Agent Chat API] Created session', { sessionId, modelProvider });
        
        // Save initial message to AgentChatMessage
        if (messages.length > 0) {
          await db.agentChatMessage.create({
            data: {
              sessionId: session.id,
              role: 'user',
              content: messages[0].content 
                ? (typeof messages[0].content === 'string' ? messages[0].content : JSON.stringify(messages[0].content))
                : '',
              timestamp: new Date(),
            },
          });
        }
      } catch (error) {
        logger.warn('[Agent Chat API] Failed to create session', error);
        // Continue without session tracking
      }
    }

    // createAgentUIStreamResponse expects UIMessages directly (not ModelMessages)
    // So we pass the original messages from the frontend
    logger.debug('[Agent Chat API] Using original UIMessages for createAgentUIStreamResponse', {
      messageCount: messages.length,
    });

    // Create streaming agent response (using V3 with Agent class)
    const finalUserRole = userRole || 'STUDENT';
    
    logger.info('[Agent Chat API] Creating agent stream', {
      userRole: finalUserRole,
      hasUserId: !!userId,
      sessionId,
      modelProvider,
    });
    
    try {
      const response = await streamWithGradingAgent(
        finalUserRole, 
        messages as UIMessage[], // Pass original UIMessages for createAgentUIStreamResponse
        userId, 
        undefined, // callOptions
        async ({ text, usage, provider }) => {
          // onFinish: Save tokens, message, and update session
          if (sessionId && userId) {
            const executionTime = Date.now() - sessionStartTime;
            const { db } = await import('@/lib/db.server');
            
            try {
              // 1. Save Assistant Message
              await db.agentChatMessage.create({
                data: {
                  sessionId,
                  role: 'assistant',
                  content: text,
                  promptTokens: usage?.promptTokens || 0,
                  completionTokens: usage?.completionTokens || 0,
                  totalTokens: usage?.totalTokens || 0,
                  timestamp: new Date(),
                },
              });

              // 2. Update Session Status and Totals
              const finalProvider = provider || modelProvider;
              logger.info('[Agent Chat API] Updating session on finish', { 
                sessionId, 
                tokens: usage?.totalTokens || 0,
                provider: finalProvider 
              });

              await db.agentChatSession.update({
                where: { id: sessionId },
                data: {
                  status: 'COMPLETED',
                  totalDuration: { increment: executionTime },
                  totalTokens: { increment: usage?.totalTokens || 0 },
                  lastActivity: new Date(),
                  modelProvider: finalProvider, 
                },
              });
              
            } catch (err) {
              logger.error('[Agent Chat API] Failed to save trace', err);
            }
          }
        },
        modelProvider // Pass user preference
      );
      
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
