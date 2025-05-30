import { db } from '@/types/database';
import { 
  updateGradingResult,
  failGradingResult,
  startGradingResult,
  updateGradingProgress,
  type GradingResultData 
} from './grading-result.server';
import { updateGradingSessionProgress } from './grading-session.server';
import { getFile } from './uploaded-file.server';
import { getRubric } from './rubric.server';
import logger from '@/utils/logger';

// Mock LLM integration - replace with actual OpenAI/Google AI integration
interface LLMGradingRequest {
  content: string;
  criteria: any[];
  fileName: string;
}

interface LLMGradingResponse {
  success: boolean;
  result?: GradingResultData;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
  };
}

/**
 * Mock LLM grading function - replace with actual LLM integration
 */
async function gradWithLLM(request: LLMGradingRequest): Promise<LLMGradingResponse> {
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Mock grading result
    const maxScore = request.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    const totalScore = Math.floor(maxScore * (0.7 + Math.random() * 0.3)); // 70-100% score
    
    const breakdown = request.criteria.map(criterion => ({
      criteriaId: criterion.id,
      score: Math.floor(criterion.maxScore * (0.7 + Math.random() * 0.3)),
      feedback: `針對「${criterion.name}」的評分：此部分表現良好，展現了對主題的理解。建議可以進一步加強論證的深度和具體例證的運用。`
    }));
    
    const result: GradingResultData = {
      totalScore,
      maxScore,
      breakdown,
      overallFeedback: `整體而言，這份作業展現了良好的理解力和表達能力。在內容組織和論證方面有不錯的表現，建議未來可以加強批判性思考和更深入的分析。總分：${totalScore}/${maxScore} (${Math.round((totalScore/maxScore)*100)}%)`
    };
    
    return {
      success: true,
      result,
      metadata: {
        model: 'gpt-4-turbo-preview',
        tokens: 1500 + Math.floor(Math.random() * 1000),
        duration: 2000 + Math.floor(Math.random() * 3000)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM grading failed'
    };
  }
}

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
    
    // Check if file has parsed content
    if (!gradingResult.uploadedFile.parsedContent) {
      await failGradingResult(resultId, 'File content not available for grading');
      return { success: false, error: 'File content not available' };
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
    
    // Grade with LLM
    const gradingRequest: LLMGradingRequest = {
      content: gradingResult.uploadedFile.parsedContent,
      criteria,
      fileName: gradingResult.uploadedFile.originalFileName
    };
    
    await updateGradingProgress(resultId, 50);
    
    const llmResponse = await gradWithLLM(gradingRequest);
    
    if (!llmResponse.success || !llmResponse.result) {
      await failGradingResult(resultId, llmResponse.error || 'LLM grading failed');
      return { success: false, error: llmResponse.error };
    }
    
    await updateGradingProgress(resultId, 90);
    
    // Save grading result
    const metadata = llmResponse.metadata ? {
      gradingModel: llmResponse.metadata.model,
      gradingTokens: llmResponse.metadata.tokens,
      gradingDuration: llmResponse.metadata.duration
    } : undefined;
    
    await updateGradingResult(resultId, llmResponse.result, metadata);
    
    // Update session progress
    await updateGradingSessionProgress(gradingResult.gradingSessionId, gradingResult.gradingSession.userId);
    
    logger.info(`Completed grading for result ${resultId} with score ${llmResponse.result.totalScore}/${llmResponse.result.maxScore}`);
    
    return { success: true };
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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