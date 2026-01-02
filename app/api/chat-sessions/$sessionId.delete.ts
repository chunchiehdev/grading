/**
 * API Route: Delete Chat Session (Soft Delete)
 * 
 * Marks a session as deleted without permanently removing it from the database
 */

import type { ActionFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // Only allow DELETE method
    if (request.method !== 'DELETE') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Authentication
    const userId = await getUserId(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { sessionId } = params;
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    logger.info('[Chat Session Delete API] Deleting session', {
      sessionId,
      userId: userId.substring(0, 8),
    });

    // Verify session exists and belongs to user
    const session = await db.agentChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, isDeleted: true },
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    if (session.userId !== userId) {
      logger.warn('[Chat Session Delete API] Unauthorized deletion attempt', {
        sessionId,
        requestingUser: userId.substring(0, 8),
        sessionOwner: session.userId.substring(0, 8),
      });
      return new Response('Forbidden', { status: 403 });
    }

    if (session.isDeleted) {
      return new Response('Session already deleted', { status: 410 });
    }

    // Soft delete: mark as deleted
    await db.agentChatSession.update({
      where: { id: sessionId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    logger.info('[Chat Session Delete API] Session deleted successfully', {
      sessionId,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('[Chat Session Delete API] Error deleting session', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete session',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
