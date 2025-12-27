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

    logger.info('[Analytics API] Fetching chat sessions', {
      page,
      limit,
      role,
      status,
      sortBy,
      sortOrder,
    });

    // Query sessions
    const [sessions, total] = await Promise.all([
      db.agentChatSession.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true },
          },
          _count: {
            select: { messages: true, stepLogs: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.agentChatSession.count({ where }),
    ]);

    const result = {
      sessions,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };

    logger.info('[Analytics API] Chat sessions retrieved', {
      count: sessions.length,
      total,
    });

    return Response.json(result);
  } catch (error) {
    logger.error('[Analytics API] Error fetching chat sessions', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
