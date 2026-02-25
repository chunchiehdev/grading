/**
 * API Route: Chat Sessions List
 * 
 * Returns paginated list of user's chat sessions
 */

import type { LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Authentication
    const userId = await getUserId(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    logger.info({
      userId: userId.substring(0, 8),
      page,
      limit,
    }, '[Chat Sessions API] Fetching sessions list');

    // Query sessions with message count
    const [sessions, total] = await Promise.all([
      db.agentChatSession.findMany({
        where: { 
          userId,
          isDeleted: false, // Only show non-deleted sessions
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          lastActivity: true,
          status: true,
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { lastActivity: 'desc' }, // Most recent first
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.agentChatSession.count({ 
        where: { 
          userId,
          isDeleted: false,
        },
      }),
    ]);

    // Transform response
    const sessionsWithCount = sessions.map(session => ({
      id: session.id,
      title: session.title || 'Untitled Chat',
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status,
      messageCount: session._count.messages,
    }));

    const result = {
      sessions: sessionsWithCount,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };

    logger.info({
      count: sessions.length,
      total,
    }, '[Chat Sessions API] Sessions retrieved');

    return Response.json(result);
  } catch (error) {
    logger.error({ err: error }, '[Chat Sessions API] Error fetching sessions');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
