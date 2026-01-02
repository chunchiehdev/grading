/**
 * API Route: Get Chat Session Detail
 * 
 * Returns a specific session with all its messages
 */

import type { LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Authentication
    const userId = await getUserId(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { sessionId } = params;
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    logger.info('[Chat Session Detail API] Fetching session', {
      sessionId,
      userId: userId.substring(0, 8),
    });

    // Query session with ownership verification
    const session = await db.agentChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            timestamp: true,
            promptTokens: true,
            completionTokens: true,
            totalTokens: true,
          },
        },
      },
    });

    // Verify session exists and belongs to user
    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    if (session.userId !== userId) {
      logger.warn('[Chat Session Detail API] Unauthorized access attempt', {
        sessionId,
        requestingUser: userId.substring(0, 8),
        sessionOwner: session.userId.substring(0, 8),
      });
      return new Response('Forbidden', { status: 403 });
    }

    // Check if session is deleted
    if (session.isDeleted) {
      return new Response('Session has been deleted', { status: 410 }); // 410 Gone
    }

    // Transform messages to UIMessage format compatible with Vercel AI SDK
    // IMPORTANT: Convert simple content string to parts format for frontend display
    const messages = session.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      // Convert to parts format for consistent display with streaming messages
      parts: [{ type: 'text', text: msg.content }],
      createdAt: msg.timestamp,
    }));

    const result = {
      session: {
        id: session.id,
        title: session.title || 'Untitled Chat',
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        userRole: session.userRole,
        status: session.status,
        totalTokens: session.totalTokens,
        totalSteps: session.totalSteps,
        totalDuration: session.totalDuration,
      },
      messages,
    };

    logger.info('[Chat Session Detail API] Session retrieved', {
      sessionId,
      messageCount: messages.length,
    });

    return Response.json(result);
  } catch (error) {
    logger.error('[Chat Session Detail API] Error fetching session', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch session',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
