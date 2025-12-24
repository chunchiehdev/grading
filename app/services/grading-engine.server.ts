import { db, GradingStatus } from '@/types/database';
import { getAIGrader } from './ai-grader.server';
import { gradeWithAI, convertToLegacyFormat, isAISDKGradingEnabled } from './ai-grader-sdk.server';
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
import { extractOverallFeedback } from '@/utils/grading-helpers';
import { gradingQueue } from './queue.server';

/**
 * Simple grading engine - no fallback hell, no special cases
 * Follows Linus principle: solve real problems simply
 */
export async function processGradingResult(
  resultId: string,
  _userId: string,
  sessionId: string,
  userLanguage: 'zh' | 'en' = 'zh',
  useDirectGrading: boolean = false
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

    // Allow retries for FAILED or PROCESSING status (e.g., after throttle recovery)
    // Only skip if already COMPLETED or SKIPPED
    if (result.status === 'COMPLETED' || result.status === 'SKIPPED') {
      logger.info(`Grading result ${resultId} already processed with status: ${result.status}`);
      return { success: true }; // Already processed successfully
    }

    // Reset status to PENDING if it's FAILED or PROCESSING (retry scenario)
    if (result.status !== 'PENDING') {
      logger.info(`Resetting status from ${result.status} to PENDING for retry`);
      await db.gradingResult.update({
        where: { id: resultId },
        data: { status: 'PENDING', progress: 0 },
      });
    }

    // Type narrowing: explicit null checks so TypeScript knows fields are non-null
    if (!result.uploadedFile) {
      return { success: false, error: 'File not found' };
    }

    if (!result.uploadedFile.parsedContent) {
      return { success: false, error: 'File has no parsed content' };
    }

    if (!result.rubric || !result.rubric.name) {
      return { success: false, error: 'Rubric not found or has no name' };
    }

    if (!result.uploadedFile.originalFileName) {
      return { success: false, error: 'File has no name' };
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

    // Grade with AI - check feature flags
    const useAgentGrading = process.env.USE_AGENT_GRADING === 'true';
    const useAISDK = isAISDKGradingEnabled();

    logger.info(`🤖 Using ${useAgentGrading ? 'Agent' : useAISDK ? 'AI SDK' : 'Legacy'} grading system`);

    // Log prompt information for complete traceability
    const gradingRequest = {
      content: result.uploadedFile.parsedContent,
      criteria: criteria,
      fileName: result.uploadedFile.originalFileName,
      rubricName: result.rubric.name,

      // options field
      ...(referenceDocuments.length > 0 && { referenceDocuments }),
      ...(customInstructions && { customInstructions }),
      assignmentTitle: result.assignmentArea?.name || 'Untitled Assignment',
      assignmentDescription: result.assignmentArea?.description || undefined,
    };

    logger.info(`📝 [Grading Engine] Prepared grading request for assignment: "${gradingRequest.assignmentTitle}"`, {
      hasAssignmentArea: !!result.assignmentArea,
      assignmentTitle: gradingRequest.assignmentTitle,
      assignmentDescriptionLength: gradingRequest.assignmentDescription?.length || 0,
    });

    // Generate and log the prompt (for research traceability)
    const prompt = GeminiPrompts.generateTextGradingPrompt(gradingRequest);
    const promptTokenEstimate = Math.ceil(prompt.length / 3.5); // Simple token estimate
    gradingLogger.addPromptInfo(sessionId, prompt, promptTokenEstimate, userLanguage);

    let gradingResponse;

    if (useAgentGrading) {
      // Agent-based grading path (AI SDK 6 beta)
      const { executeGradingAgent } = await import('./agent-executor.server');
      const { saveAgentExecution } = await import('./agent-logger.server');

      logger.info('🤖 Starting Agent-based grading', { resultId });

      const agentResult = await executeGradingAgent({
        submissionId: result.uploadedFile.id,
        uploadedFileId: result.uploadedFile.id,
        fileName: result.uploadedFile.originalFileName,
        content: result.uploadedFile.parsedContent,
        rubricId: result.rubric.id,
        rubricName: result.rubric.name,
        useDirectGrading,
        criteria: criteria.map(c => ({
          criteriaId: c.id,
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
          levels: c.levels?.map(l => ({
            score: l.score,
            description: l.description
          }))
        })),
        referenceDocuments: referenceDocuments.length > 0 ? referenceDocuments.map(ref => ({
          fileId: ref.fileId,
          fileName: ref.fileName,
          content: ref.content,
          contentLength: ref.content.length,
          wasTruncated: ref.wasTruncated,
        })) : undefined,
        customInstructions: customInstructions || undefined,
        assignmentType: 'other', // TODO: detect from assignment
        assignmentTitle: result.assignmentArea?.name || 'Untitled Assignment',
        assignmentDescription: result.assignmentArea?.description || undefined,
        userId: _userId,
        resultId,
        sessionId,
        userLanguage,
        maxSteps: 50,
        confidenceThreshold: parseFloat(process.env.AGENT_CONFIDENCE_THRESHOLD || '0.7'),
        enableSimilarityCheck: result.assignmentAreaId !== null,
      });

      // Save Agent execution to database
      await saveAgentExecution(resultId, agentResult);

      if (agentResult.success && agentResult.data) {
        // 🔍 Log the agentResult.data structure for debugging
        logger.info('🔍 [Grading Engine] agentResult.data structure:', {
          resultId,
          data: JSON.stringify(agentResult.data, null, 2),
          hasBreakdown: !!agentResult.data.breakdown,
          breakdownType: agentResult.data.breakdown ? typeof agentResult.data.breakdown : 'undefined',
          breakdownIsArray: Array.isArray(agentResult.data.breakdown),
          breakdownLength: agentResult.data.breakdown?.length,
        });

        // Convert to standard format with null safety
        if (!agentResult.data.breakdown || !Array.isArray(agentResult.data.breakdown)) {
          logger.error('❌ [Grading Engine] Invalid breakdown structure', {
            resultId,
            breakdown: agentResult.data.breakdown,
          });
          throw new Error('Agent returned invalid breakdown structure (not an array)');
        }

        const totalScore = agentResult.data.breakdown.reduce((sum, item) => sum + item.score, 0);
        const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

        // Format reasoning for transparency (XAI)
        // 收集 AI 的即時思考過程和最終評分推理
        let thoughtSummary = '';
        let thinkingProcess = '';
        let gradingRationale = '';
        
        // 1. Collect Thinking Process from think/think_aloud tool ONLY
        // The think tool contains the complete analysis, we don't want to duplicate by concatenating all steps
        const thinkStep = agentResult.steps.find((s: any) => 
          (s.toolName === 'think' || s.toolName === 'think_aloud') && s.reasoning
        );
        if (thinkStep?.reasoning) {
          thinkingProcess = thinkStep.reasoning;
        } else {
          // Fallback: collect from all steps (for backward compatibility with old data)
          thinkingProcess = agentResult.steps
            .map((s: any) => s.reasoning)
            .filter((r: string) => r && r !== 'Tool Execution' && r !== 'Analysis')
            .join('\n\n---\n\n');
        }

        // 0.5 Capture Direct Mode Thinking (Gemini Native)
        const directThinkingStep = agentResult.steps.find((s: any) => s.toolName === 'direct_grading' && s.reasoning);
        if (directThinkingStep?.reasoning) {
          // If we have native thinking from direct mode, use it as thinkingProcess
          if (!thinkingProcess) {
             thinkingProcess = directThinkingStep.reasoning;
          } else {
             thinkingProcess += `\n\n## Native Thinking\n${directThinkingStep.reasoning}`;
          }
        }
        
        // 2. Determine Grading Rationale (The "Why")
        const feedbackStep = agentResult.steps.find((s: any) => 
          s.toolName === 'generate_feedback' && s.reasoning
        );
        
        if (feedbackStep?.reasoning && feedbackStep.reasoning.length > 20) {
          // If generate_feedback has substantial reasoning, use it
          gradingRationale = feedbackStep.reasoning;
        } else {
          // Fallback: use the accumulated thinking process if specific rationale is missing
          gradingRationale = thinkingProcess;
        }

        // 3. Prepend Confidence Summary to Grading Rationale
        const confidenceStep = agentResult.steps.find((s: any) => s.toolName === 'calculate_confidence');
        const confidenceInfo = confidenceStep?.toolOutput as { confidenceScore?: number; reason?: string } | undefined;
        
        let confidenceHeader = '';
        if (confidenceInfo?.confidenceScore !== undefined) {
          confidenceHeader = `**評分信心度：${(confidenceInfo.confidenceScore * 100).toFixed(0)}%**\n${confidenceInfo.reason || ''}\n\n`;
          gradingRationale = confidenceHeader + gradingRationale;
        }

        // thoughtSummary should ONLY contain confidence info, not the full thinking process
        // This prevents duplication when displaying thinkingProcess and thoughtSummary together
        thoughtSummary = confidenceHeader.trim() || `評分已完成。總分：${totalScore}/${maxScore}`;


        gradingResponse = {
          success: true,
          result: {
            breakdown: agentResult.data.breakdown,
            totalScore,
            maxScore,
            overallFeedback: agentResult.data.overallFeedback,
          },
          thoughtSummary,
          thinkingProcess, // New Field
          gradingRationale, // New Field
          provider: 'gemini-agent',
          metadata: {
            model: 'gemini-2.5-flash-agent',
            tokens: agentResult.totalTokens,
            duration: agentResult.executionTimeMs,
            agentSteps: agentResult.steps.length,
            confidenceScore: agentResult.confidenceScore,
            requiresReview: agentResult.requiresReview,
          },
        };

        logger.info(`  Agent grading succeeded`, {
          resultId,
          confidence: agentResult.confidenceScore,
          requiresReview: agentResult.requiresReview,
          steps: agentResult.steps.length,
        });

        // If requires review, send notification to teacher
        if (agentResult.requiresReview) {
          logger.warn(`⚠️ Low confidence grading - requires human review`, {
            resultId,
            confidence: agentResult.confidenceScore,
          });
          // TODO: Send WebSocket notification to teacher
        }
      } else {
        // Agent failed, fallback to AI SDK or Legacy
        logger.error(`❌ Agent grading failed, falling back`, {
          resultId,
          error: agentResult.error,
        });
        gradingResponse = {
          success: false,
          error: agentResult.error || 'Agent grading failed',
        };
      }
    } else if (useAISDK) {
      // New AI SDK grading path
      const sdkResult = await gradeWithAI({
        prompt,
        userId: _userId,
        resultId,
        language: userLanguage,
      });

      if (sdkResult.success) {
        // Convert AI SDK result to legacy format
        const legacyFormat = convertToLegacyFormat(sdkResult.data);

        // Calculate total and max scores from breakdown
        const totalScore = legacyFormat.breakdown.reduce((sum, item) => sum + item.score, 0);
        const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

        gradingResponse = {
          success: true,
          result: {
            breakdown: legacyFormat.breakdown,
            totalScore,
            maxScore,
            overallFeedback: legacyFormat.overallFeedback,
          },
          thoughtSummary: sdkResult.thoughtSummary,
          provider: sdkResult.provider,
          metadata: {
            model: sdkResult.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini',
            tokens: sdkResult.usage.totalTokens,
            duration: sdkResult.responseTimeMs,
          },
        };
        logger.info(`  AI SDK grading succeeded with ${sdkResult.provider}`);
      } else {
        // AI SDK failed, return error
        gradingResponse = {
          success: false,
          error: sdkResult.error,
        };
        logger.error(`❌ AI SDK grading failed: ${sdkResult.error}`);
      }
    } else {
      // Legacy grading path
      const aiGrader = getAIGrader();
      gradingResponse = await aiGrader.grade(gradingRequest, userLanguage);
    }

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
          thinkingProcess: gradingResponse.thinkingProcess, // Feature 012: Save raw thinking process
          gradingRationale: gradingResponse.gradingRationale, // Feature 012: Save grading rationale
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
        gradingResponse.provider || 'unknown',
        gradingResponse.result, // This is the rawResponse from Gemini
        gradingResponse.metadata?.tokens,
        gradingResponse.metadata?.duration,
        gradingResponse.metadata?.model || undefined
      );

      // Update session progress
      await SimpleProgressService.updateSessionProgress(sessionId);

      logger.info(`  Grading completed for ${result.uploadedFile.originalFileName}`);

      // Finalize and save log
      await gradingLogger.finalize(sessionId, startTime);

      return { success: true };
    } else {
      // Failure - save error AND fallback result (if available)
      // The fallback result ensures we never have null in database
      const updateData: any = {
        status: 'FAILED',
        progress: 100,
        errorMessage: gradingResponse.error || 'AI grading failed',
        completedAt: new Date(),
      };

      // Include fallback result if provided (prevents null in database)
      if (gradingResponse.result) {
        const overallFeedbackStr = extractOverallFeedback(gradingResponse.result) || '';
        updateData.result = {
          totalScore: gradingResponse.result.totalScore,
          maxScore: gradingResponse.result.maxScore,
          breakdown: gradingResponse.result.breakdown || [],
          overallFeedback: overallFeedbackStr,
        };
      }

      await db.gradingResult.update({
        where: { id: resultId },
        data: updateData,
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
 * Process all pending results for a session - using BullMQ
 */
export async function processGradingSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`🔄 Starting grading session ${sessionId} (Async Queue)`);

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

    logger.info(`📝 Adding ${pendingResults.length} jobs to grading queue`);

    // Add jobs to BullMQ
    const jobs = pendingResults.map((result) => ({
      name: 'grade-submission',
      data: {
        resultId: result.id,
        userId: result.gradingSession.userId,
        sessionId: result.gradingSessionId,
        userLanguage: 'zh' as const, // Default to 'zh' for now, could be dynamic
      },
      opts: {
        jobId: `grade-${result.id}`, // Prevent duplicate jobs for same result
      },
    }));

    await gradingQueue.addBulk(jobs);

    logger.info(`  Queued ${jobs.length} grading jobs for session ${sessionId}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Failed to queue grading session ${sessionId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Session queuing failed' };
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

    logger.info(`  Processed ${processed} results, ${failed} failed`);
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
