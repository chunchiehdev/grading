import { db } from '@/types/database';
import { 
  updateGradingResult,
  failGradingResult,
  startGradingResult,
  updateGradingProgress,
} from './grading-result.server';
import { updateGradingSessionProgress } from './grading-session.server';
import { getGeminiService, type GeminiFileGradingRequest } from './gemini.server';
import { getFileFromStorage } from './storage.server';
import logger from '@/utils/logger';
import { getOpenAIService, type OpenAIGradingRequest, type OpenAIFileGradingRequest } from './openai.server';

/**
 * Processes a single grading result
 */
export async function processGradingResult(
  resultId: string,
  userId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`📝 Processing grading result: ${resultId}`);
    
    // Fetch result with related data
    const result = await db.gradingResult.findUnique({
      where: { id: resultId },
      include: {
        uploadedFile: true,
        rubric: true,
        gradingSession: true
      }
    });
    
    if (!result) {
      logger.error(`Grading result not found: ${resultId}`);
      return { success: false, error: 'Grading result not found' };
    }
    
    if (result.status !== 'PENDING') {
      logger.warn(`Grading result ${resultId} is not pending, current status: ${result.status}`);
      return { success: true };
    }
    
    if (!result.uploadedFile || !result.rubric) {
      logger.error(`Missing required data for result ${resultId}`);
      return { success: false, error: 'Missing file or rubric data' };
    }
    
    if (!result.uploadedFile.parsedContent) {
      logger.error(`File ${result.uploadedFile.id} has no parsed content`);
      return { success: false, error: 'File has no parsed content' };
    }
    
    // Update status to processing
    await db.gradingResult.update({
      where: { id: resultId },
      data: { status: 'PROCESSING' }
    });
    
    // Parse rubric criteria from JSON
    const criteria = Array.isArray(result.rubric.criteria) 
      ? result.rubric.criteria 
      : [];
    
    if (criteria.length === 0) {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          errorMessage: 'No grading criteria found in rubric',
          completedAt: new Date()
        }
      });
      return { success: false, error: 'No grading criteria found in rubric' };
    }
    
    // 記錄評分開始
    logger.info(`🎯 Starting grading for file: ${result.uploadedFile.originalFileName} with rubric: ${result.rubric.name}`);
    
    // 嘗試從 storage 獲取檔案內容（用於檔案上傳評分）
    let fileBuffer: Buffer | null = null;
    try {
      fileBuffer = await getFileFromStorage(result.uploadedFile.fileKey);
      logger.info(`📁 Retrieved file buffer: ${fileBuffer.length} bytes`);
    } catch (storageError) {
      logger.warn(`⚠️ Failed to retrieve file from storage: ${storageError}`);
      // 繼續使用文字內容，不中斷評分流程
    }
    
    // Attempt grading with error handling and fallback
    const gradingResponse = await attemptGradingWithFallback({
      content: result.uploadedFile.parsedContent,
      criteria: criteria,
      fileName: result.uploadedFile.originalFileName,
      rubricName: result.rubric.name,
      fileBuffer: fileBuffer, // 傳入實際的檔案 buffer
      mimeType: result.uploadedFile.mimeType
    });
    
    if (gradingResponse.success && gradingResponse.result) {
      // Save successful grading result
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'COMPLETED',
          result: gradingResponse.result as any,
          gradingModel: gradingResponse.metadata?.model,
          gradingTokens: gradingResponse.metadata?.tokens,
          gradingDuration: gradingResponse.metadata?.duration,
          completedAt: new Date()
        }
      });
      
      logger.info(`✅ Grading completed successfully for ${result.uploadedFile.originalFileName}`);
      logger.info(`📊 Final score: ${gradingResponse.result.totalScore}/${gradingResponse.result.maxScore}`);
      
      return { success: true };
      
    } else {
      // Save failed grading result
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          errorMessage: gradingResponse.error || 'Unknown grading error',
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
          errorMessage: error instanceof Error ? error.message : 'Fatal processing error',
          completedAt: new Date()
        }
      });
    } catch (updateError) {
      logger.error(`Failed to update result status for ${resultId}:`, updateError);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Fatal processing error' 
    };
  }
}

/**
 * 嘗試評分並支援備援機制（檔案優先 -> 文字備援）
 */
async function attemptGradingWithFallback(request: {
  content: string;
  criteria: any[];
  fileName: string;
  rubricName: string;
  fileBuffer?: Buffer | null;
  mimeType: string;
}): Promise<{ success: boolean; result?: any; error?: string; metadata?: any }> {
  
  const geminiService = getGeminiService();
  const openaiService = getOpenAIService();
  
  // 🎯 **階段1：檔案上傳評分（優先方式）**
  if (request.fileBuffer && (request.mimeType === 'application/pdf' || request.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    
    // 1.1 嘗試 Gemini 檔案上傳
    logger.info(`🔮 Attempting grading with Gemini (file upload): ${request.fileName}`);
    
    try {
      const geminiFileRequest: GeminiFileGradingRequest = {
        fileBuffer: request.fileBuffer,
        mimeType: request.mimeType,
        criteria: request.criteria,
        fileName: request.fileName,
        rubricName: request.rubricName
      };
      
      const geminiFileResponse = await geminiService.gradeDocumentWithFile(geminiFileRequest);
      
      if (geminiFileResponse.success) {
        logger.info(`✅ Gemini file grading successful for ${request.fileName}`);
        return {
          success: true,
          result: geminiFileResponse.result,
          metadata: { ...geminiFileResponse.metadata, provider: 'gemini', method: 'file' }
        };
      } else {
        logger.warn(`⚠️ Gemini file grading failed: ${geminiFileResponse.error}`);
        
        // 檢查是否應該繼續嘗試備援
        if (!shouldContinueFallback(geminiFileResponse)) {
          return {
            success: false,
            error: `Gemini 檔案評分失敗且不適合使用備援: ${geminiFileResponse.error}`,
            metadata: { ...geminiFileResponse.metadata, provider: 'gemini', method: 'file', fallbackSkipped: true }
          };
        }
      }
    } catch (geminiFileError) {
      logger.error(`💥 Gemini file service error:`, geminiFileError);
    }
    
    // 1.2 嘗試 OpenAI 檔案上傳（PDF 檔案）
    if (request.mimeType === 'application/pdf') {
      logger.info(`🤖 Falling back to OpenAI (file upload): ${request.fileName}`);
      
      try {
        const openaiFileRequest: OpenAIFileGradingRequest = {
          fileBuffer: request.fileBuffer,
          mimeType: request.mimeType,
          criteria: request.criteria,
          fileName: request.fileName,
          rubricName: request.rubricName
        };
        
        const openaiFileResponse = await openaiService.gradeDocumentWithFile(openaiFileRequest);
        
        if (openaiFileResponse.success) {
          logger.info(`✅ OpenAI file grading successful for ${request.fileName}`);
          return {
            success: true,
            result: openaiFileResponse.result,
            metadata: { ...openaiFileResponse.metadata, provider: 'openai', method: 'file', fallbackFromGemini: true }
          };
        } else {
          logger.warn(`⚠️ OpenAI file grading failed: ${openaiFileResponse.error}`);
        }
      } catch (openaiFileError) {
        logger.error(`💥 OpenAI file service error:`, openaiFileError);
      }
    }
  }
  
  // 🎯 **階段2：文字內容評分（備援方式）**
  logger.info(`📝 Falling back to text-based grading for: ${request.fileName}`);
  
  // 2.1 嘗試 Gemini 文字評分
  logger.info(`🔮 Attempting Gemini text grading`);
  
  try {
    const geminiTextResponse = await geminiService.gradeDocument({
      content: request.content,
      criteria: request.criteria,
      fileName: request.fileName,
      rubricName: request.rubricName
    });
    
    if (geminiTextResponse.success) {
      logger.info(`✅ Gemini text grading successful for ${request.fileName}`);
      return {
        success: true,
        result: geminiTextResponse.result,
        metadata: { ...geminiTextResponse.metadata, provider: 'gemini', method: 'text', fallbackFromFile: true }
      };
    } else {
      logger.warn(`⚠️ Gemini text grading failed: ${geminiTextResponse.error}`);
    }
  } catch (geminiTextError) {
    logger.error(`💥 Gemini text service error:`, geminiTextError);
  }
  
  // 2.2 嘗試 OpenAI 文字評分
  logger.info(`🤖 Final attempt: OpenAI text grading`);
  
  try {
    const openaiTextRequest: OpenAIGradingRequest = {
      content: request.content,
      criteria: request.criteria,
      fileName: request.fileName,
      rubricName: request.rubricName
    };
    
    const openaiTextResponse = await openaiService.gradeDocument(openaiTextRequest);
    
    if (openaiTextResponse.success) {
      logger.info(`✅ OpenAI text grading successful for ${request.fileName}`);
      return {
        success: true,
        result: openaiTextResponse.result,
        metadata: { ...openaiTextResponse.metadata, provider: 'openai', method: 'text', fallbackFromGemini: true }
      };
    } else {
      logger.warn(`⚠️ OpenAI text grading failed: ${openaiTextResponse.error}`);
    }
  } catch (openaiTextError) {
    logger.error(`💥 OpenAI text service error:`, openaiTextError);
  }
  
  // 🚨 **所有方法都失敗**
  logger.error(`❌ All grading methods failed for ${request.fileName}`);
  
  const attemptedMethods = [];
  if (request.fileBuffer) {
    attemptedMethods.push('1. Gemini 檔案評分');
    if (request.mimeType === 'application/pdf') {
      attemptedMethods.push('2. OpenAI 檔案評分');
    }
  }
  attemptedMethods.push(`${attemptedMethods.length + 1}. Gemini 文字評分`);
  attemptedMethods.push(`${attemptedMethods.length + 1}. OpenAI 文字評分`);
  
  return {
    success: false,
    error: `🚨 所有評分服務都無法處理此文件\n\n已嘗試：\n${attemptedMethods.join('\n')}\n\n請稍後再試或聯繫技術支援。`,
    metadata: { 
      provider: 'none', 
      allMethodsFailed: true,
      attemptsCount: attemptedMethods.length,
      hasFileBuffer: !!request.fileBuffer,
      mimeType: request.mimeType
    }
  };
}

/**
 * 判斷是否應該繼續使用備援服務
 */
function shouldContinueFallback(response: any): boolean {
  // 如果是重大系統錯誤，不使用備援
  if (response.metadata?.errorType === 'AuthenticationError') {
    return false;
  }
  
  // 如果是 API 配額問題，不使用備援
  if (response.error?.includes('quota') || response.error?.includes('billing')) {
    return false;
  }
  
  // 如果是檔案格式問題，可以嘗試其他方式
  if (response.error?.includes('file format') || response.error?.includes('unsupported')) {
    return true;
  }
  
  // 如果是服務過載或暫時性錯誤，使用備援
  if (response.metadata?.retryable || 
      response.error?.includes('503') || 
      response.error?.includes('overload') ||
      response.error?.includes('rate limit')) {
    return true;
  }
  
  // 預設使用備援
  return true;
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
      include: {
        gradingSession: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    if (pendingResults.length === 0) {
      return { success: true };
    }
    
    logger.info(`Found ${pendingResults.length} pending grading results to process`);
    
    // Process results sequentially to avoid overwhelming the LLM API
    for (const result of pendingResults) {
      await processGradingResult(result.id, result.gradingSession.userId, result.gradingSessionId);
      
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
      include: {
        gradingSession: true
      },
      orderBy: { createdAt: 'asc' },
      take: 50 // Process in batches
    });
    
    logger.info(`Processing ${pendingResults.length} pending grading results`);
    
    for (const result of pendingResults) {
      const processResult = await processGradingResult(result.id, result.gradingSession.userId, result.gradingSessionId);
      if (processResult.success) {
        processed++;
      } else {
        failed++;
        logger.error(`Failed to process result ${result.id}: ${processResult.error}`);
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