/**
 * Admin Analytics API: Insights (Charts Data)
 * 
 * Returns aggregated data for visualization charts
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

    logger.info('[Analytics API] Fetching insights data');

    // 1. Average Durations
    const [chatDuration, gradingDuration] = await Promise.all([
      db.agentChatSession.aggregate({
        _avg: { totalDuration: true },
      }),
      db.gradingResult.aggregate({
        _avg: { gradingDuration: true },
      }),
    ]);

    const averageDurations = {
      chat: Math.round(chatDuration._avg.totalDuration || 0),
      grading: Math.round(gradingDuration._avg.gradingDuration || 0),
    };

    // 2. Confidence Score Distribution
    const gradingResults = await db.gradingResult.findMany({
      where: { status: 'COMPLETED', confidenceScore: { not: null } },
      select: { confidenceScore: true },
    });

    const confidenceDistribution = {
      high: gradingResults.filter(r => r.confidenceScore && r.confidenceScore > 0.8).length,
      medium: gradingResults.filter(r => r.confidenceScore && r.confidenceScore >= 0.6 && r.confidenceScore <= 0.8).length,
      low: gradingResults.filter(r => r.confidenceScore && r.confidenceScore < 0.6).length,
    };

    // 3. Top Tools Usage (from agent execution logs)
    const stepLogs = await db.agentExecutionLog.findMany({
      where: { toolName: { not: null } },
      select: { toolName: true },
    });

    const toolCounts: Record<string, number> = {};
    stepLogs.forEach(log => {
      if (log.toolName) {
        toolCounts[log.toolName] = (toolCounts[log.toolName] || 0) + 1;
      }
    });

    const topTools = Object.entries(toolCounts)
      .map(([toolName, count]) => ({ toolName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Token Usage Time Series (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [chatSessions, gradingSessions] = await Promise.all([
      db.agentChatSession.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
          totalTokens: true,
        },
      }),
      db.gradingResult.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
        select: {
          createdAt: true,
          gradingTokens: true,
        },
      }),
    ]);

    // Group by date
    const tokensByDate: Record<string, { chatTokens: number; gradingTokens: number }> = {};
    
    chatSessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!tokensByDate[date]) tokensByDate[date] = { chatTokens: 0, gradingTokens: 0 };
      tokensByDate[date].chatTokens += session.totalTokens || 0;
    });

    gradingSessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!tokensByDate[date]) tokensByDate[date] = { chatTokens: 0, gradingTokens: 0 };
      tokensByDate[date].gradingTokens += session.gradingTokens || 0;
    });

    const tokenUsageTimeSeries = Object.entries(tokensByDate)
      .map(([date, tokens]) => ({ date, ...tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result = {
      averageDurations,
      confidenceDistribution,
      topTools,
      tokenUsageTimeSeries,
    };

    logger.info('[Analytics API] Insights data retrieved');

    return Response.json(result);
  } catch (error) {
    logger.error({ err: error }, '[Analytics API] Error fetching insights');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch insights',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
