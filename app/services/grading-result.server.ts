import { db, GradingStatus, type GradingResult, type Rubric, type UploadedFile } from '@/types/database';
import { Prisma } from '@prisma/client';
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';
import { extractTotalScore } from '@/utils/grading-helpers';

// GradingResultData 現在從 @/types/grading 統一導入

export interface GradingResultWithDetails extends GradingResult {
  uploadedFile: UploadedFile;
  rubric: Rubric;
}

/**
 * Updates a grading result with LLM scoring data
 */
export async function updateGradingResult(
  resultId: string,
  gradingData: GradingResultData,
  metadata?: {
    gradingModel?: string;
    gradingTokens?: number;
    gradingDuration?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.gradingResult.update({
      where: { id: resultId },
      data: {
        status: GradingStatus.COMPLETED,
        progress: 100,
        result: gradingData as unknown as Record<string, any>, // Plain object, Prisma handles JSON conversion
        gradingModel: metadata?.gradingModel,
        gradingTokens: metadata?.gradingTokens,
        gradingDuration: metadata?.gradingDuration,
        completedAt: new Date(),
      },
    });

    logger.info(`Updated grading result ${resultId} with score ${gradingData.totalScore}/${gradingData.maxScore}`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to update grading result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update grading result',
    };
  }
}

/**
 * Marks a grading result as failed
 */
export async function failGradingResult(
  resultId: string,
  errorMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        status: GradingStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });

    logger.error(`Grading result ${resultId} failed: ${errorMessage}`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to mark grading result as failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update grading result',
    };
  }
}

/**
 * Starts processing a grading result
 */
export async function startGradingResult(resultId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        status: GradingStatus.PROCESSING,
        progress: 0,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to start grading result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start grading result',
    };
  }
}

/**
 * Updates grading result progress
 */
export async function updateGradingProgress(
  resultId: string,
  progress: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        progress: Math.max(0, Math.min(100, progress)),
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update grading progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress',
    };
  }
}

/**
 * Gets a single grading result with details
 */
export async function getGradingResult(
  resultId: string,
  userId: string
): Promise<{ result?: GradingResultWithDetails; error?: string }> {
  try {
    const result = await db.gradingResult.findFirst({
      where: {
        id: resultId,
        gradingSession: { userId },
      },
      include: {
        uploadedFile: true,
        rubric: true,
      },
    });

    if (!result) {
      return { error: 'Grading result not found' };
    }

    return { result: result as GradingResultWithDetails };
  } catch (error) {
    logger.error('Failed to get grading result:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get grading result',
    };
  }
}

/**
 * Gets all grading results for a session
 */
export async function getSessionGradingResults(
  sessionId: string,
  userId: string
): Promise<{ results: GradingResultWithDetails[]; error?: string }> {
  try {
    const results = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        gradingSession: { userId },
      },
      include: {
        uploadedFile: true,
        rubric: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { results: results as GradingResultWithDetails[] };
  } catch (error) {
    logger.error('Failed to get session grading results:', error);
    return {
      results: [],
      error: error instanceof Error ? error.message : 'Failed to get grading results',
    };
  }
}

/**
 * Gets grading results by status
 */
export async function getGradingResultsByStatus(
  status: GradingStatus,
  limit: number = 50
): Promise<{ results: (GradingResult & { uploadedFile: UploadedFile; rubric: Rubric })[]; error?: string }> {
  try {
    const results = await db.gradingResult.findMany({
      where: { status },
      include: {
        uploadedFile: true,
        rubric: true,
        gradingSession: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return { results };
  } catch (error) {
    logger.error('Failed to get grading results by status:', error);
    return {
      results: [],
      error: error instanceof Error ? error.message : 'Failed to get grading results',
    };
  }
}

/**
 * Gets grading statistics for a user
 */
export async function getGradingStatistics(
  userId: string,
  timeframe?: { start: Date; end: Date }
): Promise<{
  stats?: {
    totalResults: number;
    completedResults: number;
    failedResults: number;
    averageScore: number;
    totalTokensUsed: number;
  };
  error?: string;
}> {
  try {
    // Build where clause for grading results
    const where = timeframe
      ? {
          gradingSession: { userId },
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        }
      : {
          gradingSession: { userId },
        };

    const results = await db.gradingResult.findMany({
      where,
      select: {
        status: true,
        result: true,
        gradingTokens: true,
      },
    });

    const totalResults = results.length;
    const completedResults = results.filter((r) => r.status === GradingStatus.COMPLETED).length;
    const failedResults = results.filter((r) => r.status === GradingStatus.FAILED).length;

    const completedResultsWithScores = results.filter((r) => r.status === GradingStatus.COMPLETED && r.result);

    const averageScore =
      completedResultsWithScores.length > 0
        ? completedResultsWithScores.reduce((sum, r) => {
            const totalScore = extractTotalScore(r.result);
            const maxScore = r.result && typeof r.result === 'object' && 'maxScore' in r.result ? (r.result as any).maxScore : 100;
            const percentage = totalScore && maxScore ? (totalScore / maxScore) * 100 : 0;
            return sum + percentage;
          }, 0) / completedResultsWithScores.length
        : 0;

    const totalTokensUsed = results.reduce((sum, r) => sum + (r.gradingTokens || 0), 0);

    return {
      stats: {
        totalResults,
        completedResults,
        failedResults,
        averageScore: Math.round(averageScore * 100) / 100,
        totalTokensUsed,
      },
    };
  } catch (error) {
    logger.error('Failed to get grading statistics:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get statistics',
    };
  }
}
