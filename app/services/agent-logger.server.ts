/**
 * Agent Execution Logger
 *
 * Saves Agent execution records to database for audit trail and analysis
 */

import { db } from '@/lib/db.server';
import type { AgentGradingResult, AgentStep } from '@/types/agent';
import logger from '@/utils/logger';

/**
 * Save Agent execution to database
 */
export async function saveAgentExecution(
  resultId: string,
  agentResult: AgentGradingResult
): Promise<void> {
  try {
    const { steps, confidenceScore, requiresReview, totalTokens, executionTimeMs } = agentResult;

    // Prepare tool calls summary
    const toolCalls = steps
      .filter((s) => s.toolName)
      .map((s) => ({
        stepNumber: s.stepNumber,
        toolName: s.toolName,
        durationMs: s.durationMs,
        hasOutput: !!s.toolOutput,
      }));

    // Update GradingResult with Agent data
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        agentSteps: steps as any, // Store full steps as JSON
        toolCalls: toolCalls as any,
        confidenceScore,
        requiresReview,
        agentModel: 'gemini-2.5-flash',
        agentExecutionTime: executionTimeMs,
        gradingTokens: totalTokens,
      },
    });

    // Save detailed logs to AgentExecutionLog table
    const logRecords = steps.map((step) => ({
      gradingResultId: resultId,
      stepNumber: step.stepNumber,
      toolName: step.toolName || null,
      toolInput: step.toolInput ? (step.toolInput as any) : null,
      toolOutput: step.toolOutput ? (step.toolOutput as any) : null,
      reasoning: step.reasoning || null,
      durationMs: step.durationMs,
      timestamp: step.timestamp,
    }));

    await db.agentExecutionLog.createMany({
      data: logRecords,
    });

    logger.info('[Agent Logger] Execution saved to database', {
      resultId,
      stepsCount: steps.length,
      logsCreated: logRecords.length,
      requiresReview,
    });
  } catch (error) {
    logger.error('[Agent Logger] Failed to save execution', {
      resultId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - logging failure shouldn't break grading
  }
}

/**
 * Get Agent execution logs for a grading result
 */
export async function getAgentExecutionLogs(resultId: string) {
  return db.agentExecutionLog.findMany({
    where: { gradingResultId: resultId },
    orderBy: { stepNumber: 'asc' },
  });
}

/**
 * Get statistics about Agent grading performance
 */
export async function getAgentStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
  requiresReview?: boolean;
}) {
  const where: any = {
    agentModel: { not: null }, // Only Agent-graded results
  };

  if (filters?.startDate) {
    where.createdAt = { gte: filters.startDate };
  }
  if (filters?.endDate) {
    where.createdAt = { ...where.createdAt, lte: filters.endDate };
  }
  if (filters?.requiresReview !== undefined) {
    where.requiresReview = filters.requiresReview;
  }

  const [total, reviewed, avgConfidence, avgExecutionTime] = await Promise.all([
    // Total count
    db.gradingResult.count({ where }),

    // Reviewed count
    db.gradingResult.count({
      where: { ...where, reviewedBy: { not: null } },
    }),

    // Average confidence
    db.gradingResult.aggregate({
      where,
      _avg: { confidenceScore: true },
    }),

    // Average execution time
    db.gradingResult.aggregate({
      where,
      _avg: { agentExecutionTime: true },
    }),
  ]);

  return {
    total,
    reviewed,
    reviewRate: total > 0 ? (reviewed / total) * 100 : 0,
    avgConfidence: avgConfidence._avg.confidenceScore || 0,
    avgExecutionTimeMs: avgExecutionTime._avg.agentExecutionTime || 0,
  };
}
