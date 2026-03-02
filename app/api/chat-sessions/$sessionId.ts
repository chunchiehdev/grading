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

    logger.info({
      sessionId,
      userId: userId.substring(0, 8),
    }, '[Chat Session Detail API] Fetching session');

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
        stepLogs: {
          orderBy: { timestamp: 'asc' },
          select: {
            stepNumber: true,
            toolName: true,
            toolInput: true,
            toolOutput: true,
            reasoning: true,
            durationMs: true,
            timestamp: true,
          },
        },
      },
    });

    // Verify session exists and belongs to user
    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    if (session.userId !== userId) {
      logger.warn({
        sessionId,
        requestingUser: userId.substring(0, 8),
        sessionOwner: session.userId.substring(0, 8),
      }, '[Chat Session Detail API] Unauthorized access attempt');
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
      progressEvents: session.stepLogs.map((log) => {
        const normalizedRole = session.userRole === 'TEACHER' ? 'TEACHER' : 'STUDENT';
        const input = (log.toolInput || {}) as Record<string, unknown>;
        const output = (log.toolOutput || {}) as Record<string, unknown>;
        const phase = (output.phase || input.phase || 'step_started') as
          | 'step_started'
          | 'step_completed'
          | 'tool_started'
          | 'tool_completed'
          | 'tool_failed'
          | 'agent_completed'
          | 'agent_error';

        return {
          sessionId,
          userId,
          userRole: normalizedRole,
          phase,
          title: (output.title || input.title || log.toolName || 'Progress') as string,
          stepNumber: log.stepNumber >= 0 ? log.stepNumber : undefined,
          toolName: log.toolName || undefined,
          thinking: log.reasoning || undefined,
          action: (input.action as string | undefined) || undefined,
          expectedOutcome: (input.expectedOutcome as string | undefined) || undefined,
          inputSummary: (input.inputSummary as string | undefined) || undefined,
          outputSummary: (output.outputSummary as string | undefined) || undefined,
          durationMs: log.durationMs || undefined,
          ts: (output.ts as number | undefined) || log.timestamp.getTime(),
        };
      }),
    };

    logger.info({
      sessionId,
      messageCount: messages.length,
    }, '[Chat Session Detail API] Session retrieved');

    return Response.json(result);
  } catch (error) {
    logger.error({ err: error }, '[Chat Session Detail API] Error fetching session');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch session',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
