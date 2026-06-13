/**
 * Agent Execution Logger
 *
 * Saves Agent execution records to database for audit trail and analysis
 */

import { db } from '@/lib/db.server';
import type { AgentGradingResult } from '@/types/agent';
import logger from '@/utils/logger';

export async function saveAgentExecution(resultId: string, agentResult: AgentGradingResult): Promise<void> {
  try {
    const { steps, confidenceScore, requiresReview, totalTokens, executionTimeMs } = agentResult;

    // Prepare tool calls summary
    const completedToolCalls = steps
      .filter((s) => s.toolName)
      .map((s) => ({
        stepNumber: s.stepNumber,
        toolName: s.toolName,
        durationMs: s.durationMs,
        hasOutput: !!s.toolOutput,
      }));

    const attemptedToolCalls = Object.entries(agentResult.toolCallStats?.byTool || {}).map(([toolName, callCount]) => ({
      toolName,
      callCount,
      hasOutput: false,
    }));

    const toolCalls = [
      ...completedToolCalls,
      {
        toolName: '__meta__',
        attemptedTotal: agentResult.toolCallStats?.total || 0,
        attemptedByTool: agentResult.toolCallStats?.byTool || {},
        interrupted: !!agentResult.interrupted,
        interruptionReasonCode: agentResult.interruptionReasonCode || null,
        interruptionReason: agentResult.interruptionReason || null,
      },
      ...attemptedToolCalls,
    ];

    // Update GradingResult with Agent data
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        agentSteps: steps as any, // Store full steps as JSON
        toolCalls: toolCalls as any,
        confidenceScore,
        requiresReview,
        agentModel: 'gemini-3.1-flash-lite',
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

    logger.info(
      {
        resultId,
        stepsCount: steps.length,
        logsCreated: logRecords.length,
        requiresReview,
      },
      '[Agent Logger] Execution saved to database'
    );
  } catch (error) {
    logger.error(
      {
        resultId,
        error: error instanceof Error ? error.message : String(error),
      },
      '[Agent Logger] Failed to save execution'
    );
    // Don't throw - logging failure shouldn't break grading
  }
}
