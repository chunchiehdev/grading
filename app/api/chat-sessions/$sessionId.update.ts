/**
 * API Route: Update Chat Session
 * 
 * Updates session metadata (e.g., title)
 */

import type { ActionFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';
import { z } from 'zod';

const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ERROR', 'DELETED']).optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // Only allow PATCH method
    if (request.method !== 'PATCH') {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { title, status } = validationResult.data;

    logger.info('[Chat Session Update API] Updating session', {
      sessionId,
      userId: userId.substring(0, 8),
      updates: { title, status },
    });

    // Verify session ownership
    const existingSession = await db.agentChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!existingSession) {
      return new Response('Session not found', { status: 404 });
    }

    if (existingSession.userId !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    // Update session
    const updatedSession = await db.agentChatSession.update({
      where: { id: sessionId },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        lastActivity: new Date(), // Update last activity
      },
      select: {
        id: true,
        title: true,
        status: true,
        lastActivity: true,
      },
    });

    logger.info('[Chat Session Update API] Session updated successfully', {
      sessionId,
    });

    return Response.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    logger.error('[Chat Session Update API] Error updating session', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update session',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
