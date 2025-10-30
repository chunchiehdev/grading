/**
 * Admin API: Gemini Key Health Monitoring
 *
 * Provides real-time health status for all Gemini API keys:
 * - Success/failure rates
 * - Throttle status and cooldown expiry
 * - Average response times
 * - Health scores
 * - Overall system statistics
 *
 * Endpoint: GET /api/admin/gemini-health
 *
 * Use cases:
 * - Monitor key health in production
 * - Debug rate limit issues
 * - Verify rotation is working
 * - Track performance metrics
 */

import { LoaderFunction } from 'react-router';
import { canUseRotation, getRotatingGeminiService } from '@/services/gemini-rotating.server';
import logger from '@/utils/logger';

export const loader: LoaderFunction = async ({ request }) => {
  try {
    // Check if rotation is enabled
    const rotationEnabled = canUseRotation();

    if (!rotationEnabled) {
      return Response.json({
        rotationEnabled: false,
        message:
          'Multi-key rotation is not enabled. Set all 3 Gemini API keys (GEMINI_API_KEY, GEMINI_API_KEY2, GEMINI_API_KEY3) to enable rotation.',
        keys: [],
        summary: null,
      });
    }

    // Get health metrics from rotating service
    const rotatingService = getRotatingGeminiService();

    const [keyMetrics, summaryStats] = await Promise.all([
      rotatingService.getHealthStatus(),
      rotatingService.getSummaryStats(),
    ]);

    // Format key metrics for response
    const formattedKeys = keyMetrics.map((metric) => ({
      keyId: metric.keyId,
      successCount: metric.successCount,
      failureCount: metric.failureCount,
      successRate: parseFloat((metric.successRate * 100).toFixed(2)), // Convert to percentage
      avgResponseTime: Math.round(metric.avgResponseTime),
      isThrottled: metric.isThrottled,
      throttledUntil: metric.isThrottled ? new Date(metric.throttledUntil).toISOString() : null,
      healthScore: parseFloat(metric.healthScore.toFixed(3)),
      lastUsedAt: metric.lastUsedAt > 0 ? new Date(metric.lastUsedAt).toISOString() : null,
    }));

    // Format summary stats
    const formattedSummary = {
      totalCalls: summaryStats.totalCalls,
      totalSuccesses: summaryStats.totalSuccesses,
      totalFailures: summaryStats.totalFailures,
      avgSuccessRate: parseFloat((summaryStats.avgSuccessRate * 100).toFixed(2)), // Convert to percentage
      throttledCount: summaryStats.throttledCount,
      availableCount: summaryStats.availableCount,
    };

    logger.info('Gemini health metrics retrieved', {
      rotationEnabled,
      availableKeys: summaryStats.availableCount,
      throttledKeys: summaryStats.throttledCount,
    });

    return Response.json({
      rotationEnabled: true,
      timestamp: new Date().toISOString(),
      keys: formattedKeys,
      summary: formattedSummary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to retrieve Gemini health metrics', { error: errorMessage });

    return Response.json(
      {
        error: 'Failed to retrieve health metrics',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
};
