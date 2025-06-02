import { db } from '@/types/database';
import { 
  updateGradingResult,
  failGradingResult,
  startGradingResult,
  updateGradingProgress,
  type GradingResultData 
} from './grading-result.server';
import { updateGradingSessionProgress } from './grading-session.server';
import { getGeminiService, type GeminiFileGradingRequest } from './gemini.server';
import { getFileFromStorage } from './storage.server';
import logger from '@/utils/logger';

/**
 * Processes a single grading result
 */
export async function processGradingResult(resultId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Starting grading for result ${resultId}`);
    
    // Mark as processing
    await startGradingResult(resultId);
    
    // Get grading result with related data
    const gradingResult = await db.gradingResult.findUnique({
      where: { id: resultId },
      include: {
        uploadedFile: true,
        rubric: true,
        gradingSession: true
      }
    });
    
    if (!gradingResult) {
      return { success: false, error: 'Grading result not found' };
    }
    
    // Parse rubric criteria
    const criteria = Array.isArray(gradingResult.rubric.criteria) 
      ? gradingResult.rubric.criteria 
      : [];
    
    if (criteria.length === 0) {
      await failGradingResult(resultId, 'No grading criteria found in rubric');
      return { success: false, error: 'No grading criteria found' };
    }
    
    // Update progress
    await updateGradingProgress(resultId, 25);
    
    try {
      // Get file buffer from storage
      const fileBuffer = await getFileFromStorage(gradingResult.uploadedFile.fileKey);
      
      await updateGradingProgress(resultId, 50);
      
      // Grade with Gemini using direct file upload
      const geminiService = getGeminiService();
      const geminiRequest: GeminiFileGradingRequest = {
        fileBuffer,
        mimeType: gradingResult.uploadedFile.mimeType,
        criteria,
        fileName: gradingResult.uploadedFile.originalFileName,
        rubricName: gradingResult.rubric.name
      };
      
      await updateGradingProgress(resultId, 75);
      
      const response = await geminiService.gradeDocumentWithFile(geminiRequest);
      
      if (!response.success || !response.result) {
        await failGradingResult(resultId, response.error || 'LLM grading failed');
        return { success: false, error: response.error };
      }
      
      await updateGradingProgress(resultId, 90);
      
      // Save grading result
      const metadata = response.metadata ? {
        gradingModel: response.metadata.model,
        gradingTokens: response.metadata.tokens,
        gradingDuration: response.metadata.duration
      } : undefined;
      
      await updateGradingResult(resultId, response.result, metadata);
      
      // Update session progress
      await updateGradingSessionProgress(gradingResult.gradingSessionId, gradingResult.gradingSession.userId);
      
      logger.info(`Completed grading for result ${resultId} with score ${response.result.totalScore}/${response.result.maxScore}`);
      
      return { success: true };
      
    } catch (fileError) {
      // Fallback to parsed content if file upload fails
      logger.warn(`File upload failed for ${resultId}, falling back to parsed content:`, fileError);
      
      if (!gradingResult.uploadedFile.parsedContent) {
        await failGradingResult(resultId, 'File content not available for grading and file upload failed');
        return { success: false, error: 'File content not available' };
      }
      
      // Use original text-based grading as fallback
      const geminiService = getGeminiService();
      const geminiRequest = {
        content: gradingResult.uploadedFile.parsedContent,
        criteria,
        fileName: gradingResult.uploadedFile.originalFileName,
        rubricName: gradingResult.rubric.name
      };
      
      await updateGradingProgress(resultId, 75);
      
      const response = await geminiService.gradeDocument(geminiRequest);
      
      if (!response.success || !response.result) {
        await failGradingResult(resultId, response.error || 'LLM grading failed');
        return { success: false, error: response.error };
      }
      
      await updateGradingProgress(resultId, 90);
      
      // Save grading result
      const metadata = response.metadata ? {
        gradingModel: response.metadata.model,
        gradingTokens: response.metadata.tokens,
        gradingDuration: response.metadata.duration
      } : undefined;
      
      await updateGradingResult(resultId, response.result, metadata);
      
      // Update session progress
      await updateGradingSessionProgress(gradingResult.gradingSessionId, gradingResult.gradingSession.userId);
      
      logger.info(`Completed fallback grading for result ${resultId} with score ${response.result.totalScore}/${response.result.maxScore}`);
      
      return { success: true };
    }
  } catch (error) {
    logger.error(`Failed to process grading result ${resultId}:`, error);
    await failGradingResult(resultId, error instanceof Error ? error.message : 'Grading failed');
    return { success: false, error: error instanceof Error ? error.message : 'Grading failed' };
  }
}

/**
 * Processes all pending grading results for a session
 */
export async function processGradingSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Starting grading session ${sessionId}`);
    
    // Get all pending results for this session
    const pendingResults = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    });
    
    if (pendingResults.length === 0) {
      return { success: true };
    }
    
    logger.info(`Found ${pendingResults.length} pending grading results to process`);
    
    // Process results sequentially to avoid overwhelming the LLM API
    for (const result of pendingResults) {
      await processGradingResult(result.id);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    logger.info(`Completed grading session ${sessionId}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to process grading session ${sessionId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Session processing failed' };
  }
}

/**
 * Processes all pending grading results across all sessions
 * This function would typically be called by a background job
 */
export async function processAllPendingGrading(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  
  try {
    // Get all pending grading results
    const pendingResults = await db.gradingResult.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 50 // Process in batches
    });
    
    logger.info(`Processing ${pendingResults.length} pending grading results`);
    
    for (const result of pendingResults) {
      const processResult = await processGradingResult(result.id);
      if (processResult.success) {
        processed++;
      } else {
        failed++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    logger.info(`Processed ${processed} grading results, ${failed} failed`);
    
  } catch (error) {
    logger.error('Failed to process pending grading:', error);
  }
  
  return { processed, failed };
}

/**
 * Retry failed grading results
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
    
    logger.info(`Reset ${retriedCount} failed grading results to pending`);
    
    return { success: true, retriedCount };
  } catch (error) {
    logger.error('Failed to retry failed grading:', error);
    return {
      success: false,
      retriedCount: 0,
      error: error instanceof Error ? error.message : 'Retry failed'
    };
  }
}