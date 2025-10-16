import { db } from '@/types/database';
import { getAIGrader } from './ai-grader.server';
import { SimpleProgressService } from './progress-simple.server';
import logger from '@/utils/logger';

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
  
  try {
    logger.info(`🎯 Processing grading result: ${resultId}`);
    
    // Get result with required data
    const result = await db.gradingResult.findUnique({
      where: { id: resultId },
      include: {
        uploadedFile: true,
        rubric: true,
        gradingSession: true
      }
    });
    
    if (!result) {
      return { success: false, error: 'Grading result not found' };
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
    let criteria: any[];
    try {
      const rubricData = Array.isArray(result.rubric.criteria) 
        ? result.rubric.criteria 
        : JSON.parse(result.rubric.criteria as string);
      
      // Check if it's the new category format  
      if (Array.isArray(rubricData) && rubricData[0]?.criteria) {
        criteria = rubricData.flatMap((cat: any) => cat.criteria);
      } else {
        criteria = rubricData;
      }
    } catch (error) {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: 'Invalid rubric format',
          completedAt: new Date()
        }
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
          completedAt: new Date()
        }
      });
      return { success: false, error: 'No grading criteria found' };
    }

    // Update progress
    await SimpleProgressService.updateGradingProgress(resultId, 50);

    // Grade with AI - simple and direct
    const aiGrader = getAIGrader();
    const gradingResponse = await aiGrader.grade({
      content: result.uploadedFile.parsedContent,
      criteria: criteria,
      fileName: result.uploadedFile.originalFileName,
      rubricName: result.rubric.name
    }, userLanguage);

    // Update progress
    await SimpleProgressService.updateGradingProgress(resultId, 80);

    if (gradingResponse.success && gradingResponse.result) {
      // Calculate 100-point normalized score
      const { totalScore, maxScore } = gradingResponse.result;
      const normalizedScore = maxScore > 0
        ? Math.round((totalScore / maxScore) * 10000) / 100
        : null;

      logger.info(`📊 Normalized score: ${totalScore}/${maxScore} → ${normalizedScore}/100`);

      // Success - save result
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          result: gradingResponse.result as any,
          normalizedScore,
          gradingModel: gradingResponse.provider,
          gradingTokens: gradingResponse.metadata?.tokens,
          gradingDuration: gradingResponse.metadata?.duration,
          completedAt: new Date()
        }
      });
      
      // Update session progress
      await SimpleProgressService.updateSessionProgress(sessionId);
      
      logger.info(`✅ Grading completed for ${result.uploadedFile.originalFileName}`);
      return { success: true };
      
    } else {
      // Failure - save error
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: gradingResponse.error || 'AI grading failed',
          completedAt: new Date()
        }
      });
      
      logger.error(`❌ Grading failed for ${result.uploadedFile.originalFileName}: ${gradingResponse.error}`);
      return { success: false, error: gradingResponse.error };
    }
    
  } catch (error) {
    logger.error(`💥 Fatal error processing grading result ${resultId}:`, error);
    
    // Mark as failed
    try {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: error instanceof Error ? error.message : 'Processing error',
          completedAt: new Date()
        }
      });
    } catch (updateError) {
      logger.error(`Failed to update result status for ${resultId}:`, updateError);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing error' 
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
        status: 'PENDING'
      },
      include: { gradingSession: true },
      orderBy: { createdAt: 'asc' }
    });
    
    if (pendingResults.length === 0) {
      return { success: true };
    }
    
    logger.info(`📝 Processing ${pendingResults.length} pending results`);
    
    // Process sequentially to avoid overwhelming APIs
    for (const result of pendingResults) {
      await processGradingResult(result.id, result.gradingSession.userId, result.gradingSessionId, 'zh'); // Default to Chinese for batch processing
      
      // Simple delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      take: 50 // Process in reasonable batches
    });
    
    logger.info(`🔄 Processing ${pendingResults.length} pending grading results`);
    
    for (const result of pendingResults) {
      const processResult = await processGradingResult(result.id, result.gradingSession.userId, result.gradingSessionId, 'zh'); // Default to Chinese for batch processing
      
      if (processResult.success) {
        processed++;
      } else {
        failed++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
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
export async function retryFailedGrading(sessionId?: string): Promise<{ success: boolean; retriedCount: number; error?: string }> {
  try {
    const whereClause: any = { status: 'FAILED' };
    if (sessionId) {
      whereClause.gradingSessionId = sessionId;
    }
    
    const failedResults = await db.gradingResult.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 20 // Retry in batches
    });
    
    let retriedCount = 0;
    
    for (const result of failedResults) {
      // Reset status to pending
      await db.gradingResult.update({
        where: { id: result.id },
        data: {
          status: 'PENDING',
          errorMessage: null,
          progress: 0
        }
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
      error: error instanceof Error ? error.message : 'Retry failed'
    };
  }
}