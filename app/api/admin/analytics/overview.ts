/**
 * Admin Analytics API: Overview Statistics
 * 
 * Returns summary statistics for the analytics dashboard
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
      return new Response('Forbidden: Admin access required', { status: 403 });
    }

    logger.info('[Analytics API] Fetching overview stats', { userId });

    // Query statistics
    const [
      totalChatSessions,
      totalGradingSessions,
      chatTokenStats,
      gradingTokenStats,
      chatDurationStats,
      gradingDurationStats,
    ] = await Promise.all([
      // Total agent chat sessions
      db.agentChatSession.count(),
      
      // Total grading sessions
      db.gradingResult.count({ where: { status: 'COMPLETED' } }),
      
      // Total tokens from agent chats
      db.agentChatSession.aggregate({
        _sum: { totalTokens: true },
      }),
      
      // Total tokens from grading
      db.gradingResult.aggregate({
        _sum: { gradingTokens: true },
      }),
      
      // Average chat duration
      db.agentChatSession.aggregate({
        _avg: { totalDuration: true },
      }),
      
      // Average grading duration
      db.gradingResult.aggregate({
        _avg: { gradingDuration: true },
      }),
    ]);

    const totalTokensUsed =
      (chatTokenStats._sum.totalTokens || 0) +
      (gradingTokenStats._sum.gradingTokens || 0);

    const averageDuration = Math.round(
      ((chatDurationStats._avg.totalDuration || 0) +
        (gradingDurationStats._avg.gradingDuration || 0)) /
        2
    );

    const result = {
      totalChatSessions,
      totalGradingSessions,
      totalTokensUsed,
      averageDuration,
      periodStart: null, // TODO: Add date filtering
      periodEnd: null,
    };

    logger.info('[Analytics API] Overview stats retrieved', result);

    return Response.json(result);
  } catch (error) {
    logger.error('[Analytics API] Error fetching overview', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
