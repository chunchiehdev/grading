import { db, GradingStatus } from '@/types/database';
import { getAIGrader } from './ai-grader.server';
import { SimpleProgressService } from './progress-simple.server';
import { loadReferenceDocuments, getCustomGradingInstructions } from './assignment-area.server';
import { getGradingLogger } from './grading-logger.server';
import { GeminiPrompts } from './gemini-prompts.server';
import logger from '@/utils/logger';
import {
  parseRubricCriteria,
  parseRubricCriteriaWithDefault,
  flattenCategoriesToCriteria,
  type DbCriterion,
} from '@/schemas/rubric-data';
import type { UsedContext } from '@/utils/grading-helpers';
import { extractOverallFeedback } from '@/utils/grading-helpers';

/**
 * Simple grading engine - no fallback hell, no special cases
 * Follows Linus principle: solve real problems simply
 */
export async function processGradingResult(
  resultId: string,
  _userId: string,
  sessionId: string,
  userLanguage: 'zh' | 'en' = 'zh'
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  const gradingLogger = getGradingLogger();
  gradingLogger.initializeSessionLog(sessionId, resultId);

  try {
    logger.info(`Processing grading result: ${resultId}`);

    // Get result with required data
    const result = await db.gradingResult.findUnique({
      where: { id: resultId },
      include: {
        uploadedFile: true,
        rubric: true,
        gradingSession: {
          include: {
            user: true,
          },
        },
        assignmentArea: true,
      },
    });

    if (!result) {
      return { success: false, error: 'Grading result not found' };
    }

    // Log user information
    if (result.gradingSession?.user) {
      gradingLogger.addUserInfo(
        sessionId,
        result.gradingSession.user.id,
        result.gradingSession.user.email,
        result.gradingSession.user.role
      );
    }

    // Log assignment information
    if (result.assignmentArea) {
      gradingLogger.addAssignmentInfo(
        sessionId,
        result.assignmentArea.id,
        result.assignmentArea.name || 'Untitled Assignment'
      );
    }

    // Log file and rubric information
    if (result.uploadedFile) {
      gradingLogger.addFileInfo(
        sessionId,
        result.uploadedFileId,
        result.uploadedFile.originalFileName,
        `s3://${result.uploadedFile.fileKey}`
      );
    }

    if (result.rubric) {
      gradingLogger.addRubricInfo(
        sessionId,
        result.rubricId,
        result.rubric.name
      );
    }

    if (result.status !== 'PENDING') {
      return { success: true }; // Already processed
    }

    if (!result.uploadedFile?.parsedContent) {
      return { success: false, error: 'File has no parsed content' };
    }

    // Update to processing
    await SimpleProgressService.updateGradingProgress(resultId, 10, 'PROCESSING');

    // Parse criteria - handle both old and new format
    let criteria: DbCriterion[];
    try {
      const rubricData = parseRubricCriteria(result.rubric.criteria);

      if (rubricData && rubricData.length > 0) {
        // Check if it's the new category format (categories with nested criteria)
        // DbRubricCriteria is (DbCategory | DbCriterion)[]
        const firstItem = rubricData[0];
        if (firstItem && 'criteria' in firstItem && Array.isArray((firstItem as any).criteria)) {
          // This is DbCategory format with nested criteria
          criteria = flattenCategoriesToCriteria(rubricData);
        } else {
          // Assume it's flat DbCriterion array
          criteria = rubricData as any as DbCriterion[];
        }
      } else {
        criteria = [];
      }
    } catch (error) {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: 'Invalid rubric format',
          completedAt: new Date(),
        },
      });
      return { success: false, error: 'Invalid rubric format' };
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: 'No grading criteria found',
          completedAt: new Date(),
        },
      });
      return { success: false, error: 'No grading criteria found' };
    }

    // Update progress
    await SimpleProgressService.updateGradingProgress(resultId, 50);

    // Feature 004: Load context if assignmentAreaId is available
    let referenceDocuments: Array<{ fileId: string; fileName: string; content: string; wasTruncated: boolean }> = [];
    let customInstructions: string | null = null;

    if (result.assignmentAreaId) {
      try {
        logger.info(`📚 Loading context for assignment ${result.assignmentAreaId}`);
        referenceDocuments = await loadReferenceDocuments(result.assignmentAreaId);
        customInstructions = await getCustomGradingInstructions(result.assignmentAreaId);

        logger.info(
          `Loaded ${referenceDocuments.length} reference documents, custom instructions: ${customInstructions ? 'yes' : 'no'}`
        );

        // Log context information for Feature 004
        gradingLogger.addContextInfo(
          sessionId,
          referenceDocuments.map((doc) => ({
            fileId: doc.fileId,
            fileName: doc.fileName,
            contentLength: doc.content.length,
            wasTruncated: doc.wasTruncated,
          })),
          !!customInstructions,
          customInstructions?.length
        );
      } catch (error) {
        // Graceful degradation - log error but continue with grading
        logger.warn(`⚠️ Failed to load context for assignment ${result.assignmentAreaId}:`, error);
        // Log context loading failure
        gradingLogger.addError(sessionId, 'Context loading', error instanceof Error ? error.message : String(error));
      }
    }

    // Grade with AI - simple and direct with optional context
    const aiGrader = getAIGrader();

    // Log prompt information for complete traceability
    const gradingRequest = {
      content: result.uploadedFile.parsedContent,
      criteria: criteria,
      fileName: result.uploadedFile.originalFileName,
      rubricName: result.rubric.name,
      // Feature 004: Include context if available
      referenceDocuments: referenceDocuments.length > 0 ? referenceDocuments : undefined,
      customInstructions: customInstructions || undefined,
    };

    // Generate and log the prompt (for research traceability)
    const prompt = GeminiPrompts.generateTextGradingPrompt(gradingRequest);
    const promptTokenEstimate = Math.ceil(prompt.length / 3.5); // Simple token estimate
    gradingLogger.addPromptInfo(sessionId, prompt, promptTokenEstimate, userLanguage);

    const gradingResponse = await aiGrader.grade(gradingRequest, userLanguage);

    // Update progress
    await SimpleProgressService.updateGradingProgress(resultId, 80);

    if (gradingResponse.success && gradingResponse.result) {
      // Calculate 100-point normalized score
      const { totalScore, maxScore } = gradingResponse.result;
      const normalizedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : null;

      logger.info(`📊 Normalized score: ${totalScore}/${maxScore} → ${normalizedScore}/100`);

      // Log thought summary if available
      if (gradingResponse.thoughtSummary) {
        logger.info(`💭 Thought summary available (${gradingResponse.thoughtSummary.length} chars)`);
      }

      // Feature 004: Build context transparency metadata
      const usedContext =
        result.assignmentAreaId && (referenceDocuments.length > 0 || customInstructions)
          ? {
              assignmentAreaId: result.assignmentAreaId,
              referenceFilesUsed: referenceDocuments.map((doc) => ({
                fileId: doc.fileId,
                fileName: doc.fileName,
                contentLength: doc.content.length,
                wasTruncated: doc.wasTruncated,
              })),
              customInstructionsUsed: !!customInstructions,
            }
          : null;

      // Success - save result with context metadata and thought summary
      // Note: We convert to plain objects for Prisma's JSON field compatibility
      // (Prisma's InputJsonObject type requires flexibility for structured data)
      // Also extract overallFeedback as string (handles both string and structured formats)
      const overallFeedbackStr = extractOverallFeedback(gradingResponse.result) || '';

      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          result: {
            totalScore: gradingResponse.result.totalScore,
            maxScore: gradingResponse.result.maxScore,
            breakdown: gradingResponse.result.breakdown || [],
            overallFeedback: overallFeedbackStr,
          },
          thoughtSummary: gradingResponse.thoughtSummary, // Feature 005: Save AI thinking process
          normalizedScore,
          gradingModel: gradingResponse.provider,
          gradingTokens: gradingResponse.metadata?.tokens,
          gradingDuration: gradingResponse.metadata?.duration,
          usedContext: usedContext ? {
            assignmentAreaId: usedContext.assignmentAreaId,
            referenceFilesUsed: usedContext.referenceFilesUsed,
            customInstructionsUsed: usedContext.customInstructionsUsed,
          } : undefined, // Use undefined instead of null for optional JSON fields
          completedAt: new Date(),
        },
      });

      logger.info(`💾 Saved thoughtSummary (${gradingResponse.thoughtSummary?.length || 0} chars) to DB`);

      // Log grading success
      gradingLogger.addResult(
        sessionId,
        gradingResponse.result?.totalScore,
        gradingResponse.result?.maxScore,
        normalizedScore || undefined,
        extractOverallFeedback(gradingResponse.result) || undefined,
        gradingResponse.result?.breakdown || []
      );
      // Log AI response (rawResponse only - avoid duplication with "result")
      gradingLogger.addAIResponse(
        sessionId,
        gradingResponse.provider,
        gradingResponse.result, // This is the rawResponse from Gemini
        gradingResponse.metadata?.tokens,
        gradingResponse.metadata?.duration,
        gradingResponse.metadata?.model || undefined
      );

      // Update session progress
      await SimpleProgressService.updateSessionProgress(sessionId);

      logger.info(`✅ Grading completed for ${result.uploadedFile.originalFileName}`);

      // Finalize and save log
      await gradingLogger.finalize(sessionId, startTime);

      return { success: true };
    } else {
      // Failure - save error
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: gradingResponse.error || 'AI grading failed',
          completedAt: new Date(),
        },
      });

      // Log grading failure
      gradingLogger.addError(sessionId, 'AI grading', gradingResponse.error || 'AI grading failed');

      logger.error(`❌ Grading failed for ${result.uploadedFile.originalFileName}: ${gradingResponse.error}`);

      // Finalize and save log
      await gradingLogger.finalize(sessionId, startTime);

      return { success: false, error: gradingResponse.error };
    }
  } catch (error) {
    logger.error(`💥 Fatal error processing grading result ${resultId}:`, error);

    // Log fatal error
    gradingLogger.addError(
      sessionId,
      'Fatal error',
      error instanceof Error ? error.message : 'Processing error'
    );

    // Mark as failed
    try {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: error instanceof Error ? error.message : 'Processing error',
          completedAt: new Date(),
        },
      });
    } catch (updateError) {
      logger.error(`Failed to update result status for ${resultId}:`, updateError);
    }

    // Finalize and save log
    await gradingLogger.finalize(sessionId, startTime);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing error',
    };
  }
}

/**
 * Process all pending results for a session - simple batch processing
 */
export async function processGradingSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`🔄 Starting grading session ${sessionId}`);

    const pendingResults = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        status: 'PENDING',
      },
      include: { gradingSession: true },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingResults.length === 0) {
      return { success: true };
    }

    logger.info(`📝 Processing ${pendingResults.length} pending results`);

    // Process sequentially to avoid overwhelming APIs
    for (const result of pendingResults) {
      // Feature 004: Use default fallback language for batch processing
      await processGradingResult(result.id, result.gradingSession.userId, result.gradingSessionId, 'zh');

      // Simple delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info(`✅ Completed grading session ${sessionId}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Failed to process grading session ${sessionId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Session processing failed' };
  }
}

/**
 * Process all pending grading across all sessions - background job
 */
export async function processAllPendingGrading(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  try {
    const pendingResults = await db.gradingResult.findMany({
      where: { status: 'PENDING' },
      include: { gradingSession: true },
      orderBy: { createdAt: 'asc' },
      take: 50, // Process in reasonable batches
    });

    logger.info(`🔄 Processing ${pendingResults.length} pending grading results`);

    for (const result of pendingResults) {
      // Feature 004: Use default fallback language for batch processing
      const processResult = await processGradingResult(
        result.id,
        result.gradingSession.userId,
        result.gradingSessionId,
        'zh'
      );

      if (processResult.success) {
        processed++;
      } else {
        failed++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    logger.info(`✅ Processed ${processed} results, ${failed} failed`);
  } catch (error) {
    logger.error('❌ Failed to process pending grading:', error);
  }

  return { processed, failed };
}

/**
 * Retry failed grading results - simple version
 */
export async function retryFailedGrading(
  sessionId?: string
): Promise<{ success: boolean; retriedCount: number; error?: string }> {
  try {
    const where = sessionId
      ? { status: GradingStatus.FAILED, gradingSessionId: sessionId }
      : { status: GradingStatus.FAILED };

    const failedResults = await db.gradingResult.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 20, // Retry in batches
    });

    let retriedCount = 0;

    for (const result of failedResults) {
      // Reset status to pending
      await db.gradingResult.update({
        where: { id: result.id },
        data: {
          status: 'PENDING',
          errorMessage: null,
          progress: 0,
        },
      });

      retriedCount++;
    }

    logger.info(`🔄 Reset ${retriedCount} failed grading results to pending`);

    return { success: true, retriedCount };
  } catch (error) {
    logger.error('❌ Failed to retry failed grading:', error);
    return {
      success: false,
      retriedCount: 0,
      error: error instanceof Error ? error.message : 'Retry failed',
    };
  }
}
