/**
 * Admin Analytics API: Chat Sessions List
 * 
 * Returns paginated list of agent chat sessions with filtering
 */

import type { LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Authentication & Authorization
    const userId = await getUserId(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {};
    if (role) where.userRole = role;
    if (status) where.status = status;

    logger.info({
      page,
      limit,
      role,
      status,
      sortBy,
      sortOrder,
    }, '[Analytics API] Fetching chat sessions');

    // Query sessions
    const [sessions, total] = await Promise.all([
      db.agentChatSession.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true, picture: true },
          },
          _count: {
            select: { messages: true, stepLogs: true },
          },
          messages: {
            select: { totalTokens: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.agentChatSession.count({ where }),
    ]);

    // Calculate actual tokens from messages if session.totalTokens is 0
    const sessionsWithTokens = sessions.map(session => {
      const calculatedTokens = session.messages.reduce((sum, msg) => sum + (msg.totalTokens || 0), 0);
      return {
        ...session,
        // If session.totalTokens is 0, usage the calculated sum, otherwise use the stored value
        totalTokens: session.totalTokens > 0 ? session.totalTokens : calculatedTokens,
        // Remove messages from the response to keep payload small
        messages: undefined,
      };
    });

    const result = {
      sessions: sessionsWithTokens,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };

    logger.info({
      count: sessions.length,
      total,
    }, '[Analytics API] Chat sessions retrieved');

    return Response.json(result);
  } catch (error) {
    logger.error({ err: error }, '[Analytics API] Error fetching chat sessions');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
