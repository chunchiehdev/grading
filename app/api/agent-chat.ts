/**
 * API Route: Agent Chat
 *
 * Streaming chat endpoint for the grading agent
 * Using V3 with official Vercel AI SDK Agent class for production-grade agent management
 */

import type { ActionFunctionArgs } from 'react-router';
import { streamWithPlatformAssistant } from '@/services/platform-assistant.server';
import { getUserId } from '@/services/auth.server';
import { type UIMessage } from 'ai';
import logger from '@/utils/logger';

// Token limit threshold - warn user when approaching vLLM's 32K context limit
const TOKEN_LIMIT_THRESHOLD = 25000;

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
    const { sessionId: requestedSessionId, message: newMessage } = body;

    // Validate input - expect single new message, not full history
    if (!newMessage || typeof newMessage !== 'string' || newMessage.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: message string required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Limit message length to prevent DoS
    if (newMessage.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 10000 characters)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse model preference from cookie early
    const cookieHeader = request.headers.get('Cookie');
    let modelProvider: 'gemini' | 'local' | 'auto' = 'auto'; // Default
    
    if (cookieHeader) {
      const match = cookieHeader.match(/ai-model-provider=(gemini|local|auto)/);
      if (match) {
        modelProvider = match[1] as any;
      }
    }

    logger.info('[Agent Chat API] Processing chat request', {
      userId,
      userRole,
      messageLength: newMessage.length,
      modelProviderPreference: modelProvider,
      requestedSessionId,
    });

    // Load message history for context (if continuing session)
    let messageHistory: UIMessage[] = [];
    
    // Create or retrieve AgentChatSession for analytics tracking
    let sessionId: string | undefined = requestedSessionId;
    let currentSessionTokens = 0; // Track current session token count
    let sessionStartTime = Date.now();
    
    if (userId) {
      try {
        const { db } = await import('@/lib/db.server');
        
        // 1. Verify session ownership if requested
        if (sessionId) {
          const existingSession = await db.agentChatSession.findFirst({
            where: { 
              id: sessionId, 
              userId,
              isDeleted: false, // Don't allow access to deleted sessions
            },
          });

          if (!existingSession) {
            // 🔒 SECURITY: Return 403 instead of silently creating new session
            logger.warn('[Agent Chat API] Unauthorized session access attempt', {
              requestedSessionId: sessionId,
              userId: userId?.substring(0, 8),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            });
            return new Response(
              JSON.stringify({ error: 'Session not found or unauthorized' }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // Load message history from database
          const dbMessages = await db.agentChatMessage.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' },
            select: {
              id: true,
              role: true,
              content: true,
              timestamp: true,
            },
          });

          messageHistory = dbMessages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: msg.content }],
          })) as UIMessage[];

          // Get current token count and check limit
          currentSessionTokens = existingSession.totalTokens || 0;
          
          // 🛑 BLOCK if token limit exceeded (prevent further API calls)
          if (currentSessionTokens >= TOKEN_LIMIT_THRESHOLD) {
            logger.warn('[Agent Chat API] Token limit exceeded - blocking request', {
              sessionId,
              currentTokens: currentSessionTokens,
              threshold: TOKEN_LIMIT_THRESHOLD,
            });
            return new Response(
              JSON.stringify({ 
                error: 'Token limit exceeded',
                code: 'TOKEN_LIMIT_EXCEEDED',
                currentTokens: currentSessionTokens,
                threshold: TOKEN_LIMIT_THRESHOLD,
              }),
              {
                status: 429, // Too Many Requests
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Session-Token-Count': String(currentSessionTokens),
                  'X-Token-Limit-Exceeded': 'true',
                },
              }
            );
          }

          // Update session to ACTIVE and lastActivity
          await db.agentChatSession.update({
            where: { id: sessionId },
            data: { 
              status: 'ACTIVE',
              lastActivity: new Date(),
            }
          });
          
          logger.info('[Agent Chat API] Continuing existing session', { 
            sessionId, 
            historyLength: messageHistory.length 
          });
        }

        // 2. Create new session if needed (first message)
        if (!sessionId) {
          const title = newMessage.substring(0, 100);

          const session = await db.agentChatSession.create({
            data: {
              userId,
              userRole: userRole || 'STUDENT',
              title,
              status: 'ACTIVE',
              modelProvider: modelProvider,
              isDeleted: false,
            },
          });
          
          sessionId = session.id;
          logger.info('[Agent Chat API] Created new session', { sessionId, modelProvider });
        }
        
        // 3. Save the NEW user message to database
        await db.agentChatMessage.create({
          data: {
            sessionId: sessionId!,
            role: 'user',
            content: newMessage,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        logger.error('[Agent Chat API] Failed to manage session', error);
        // Don't continue without proper session tracking for authenticated users
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Build complete message array for agent: [...history, newMessage]
    const messages: UIMessage[] = [
      ...messageHistory,
      {
        id: `temp-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text' as const, text: newMessage }],
      } as UIMessage
    ];

    // createAgentUIStreamResponse expects UIMessages directly (not ModelMessages)
    logger.debug('[Agent Chat API] Using messages for agent', {
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
      const response = await streamWithPlatformAssistant(
        finalUserRole, 
        messages as UIMessage[],
        userId, 
        undefined, // callOptions
        async ({ text, usage, provider }) => {
          // onFinish: Save tokens, message, and update session to IDLE
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

              // 2. Update Session Status to IDLE (not COMPLETED - can be continued)
              const finalProvider = provider || modelProvider;
              logger.info('[Agent Chat API] Updating session on finish', { 
                sessionId, 
                tokens: usage?.totalTokens || 0,
                provider: finalProvider 
              });

              await db.agentChatSession.update({
                where: { id: sessionId },
                data: {
                  status: 'IDLE', // Changed from COMPLETED - session can be continued
                  totalDuration: { increment: executionTime },
                  totalTokens: { increment: usage?.totalTokens || 0 },
                  lastActivity: new Date(),
                  modelProvider: finalProvider, 
                },
              });
              
            } catch (err) {
              logger.error('[Agent Chat API] Failed to save message and update session', err);
            }
          }
        },
        modelProvider // Pass user preference
      );
      
      // Add sessionId and token tracking to headers
      if (sessionId) {
        response.headers.set('X-Chat-Session-Id', sessionId);
        response.headers.set('X-Session-Token-Count', String(currentSessionTokens));
        
        // Mark if approaching limit (80% of threshold)
        if (currentSessionTokens >= TOKEN_LIMIT_THRESHOLD * 0.8) {
          response.headers.set('X-Token-Limit-Warning', 'true');
        }
        if (currentSessionTokens >= TOKEN_LIMIT_THRESHOLD) {
          response.headers.set('X-Token-Limit-Exceeded', 'true');
        }
      }

      logger.info('[Agent Chat API] Agent response created successfully', {
        sessionTokens: currentSessionTokens,
        tokenLimitThreshold: TOKEN_LIMIT_THRESHOLD,
      });
      return response;
    } catch (streamError) {
      // Update session status to ERROR
      if (sessionId && userId) {
        try {
          const { db } = await import('@/lib/db.server');
          await db.agentChatSession.update({
            where: { id: sessionId },
            data: {
              status: 'ERROR',
              lastActivity: new Date(),
            },
          });
        } catch (err) {
          logger.error('[Agent Chat API] Failed to update session status to ERROR', err);
        }
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
