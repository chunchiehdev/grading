import { getSimpleGeminiService } from './gemini-simple.server';
import { getSimpleOpenAIService } from './openai-simple.server';
import { GradingResultData } from '@/types/grading';
import logger from '@/utils/logger';

export interface GradingRequest {
  content: string;
  criteria: any[];
  fileName: string;
  rubricName: string;
}

export interface GradingResponse {
  success: boolean;
  result?: GradingResultData;
  error?: string;
  provider?: string;
  metadata?: any;
}

/**
 * Simple AI grader with 2-tier fallback
 * This is how you write good code: clear, direct, no bullshit
 */
export class AIGrader {
  /**
   * Grade a document using AI - the Linus way
   * Try Gemini first, fallback to OpenAI if it fails
   * That's it. No complex retry logic, no special cases, no 1500 lines of garbage.
   */
  async grade(request: GradingRequest, userLanguage: 'zh' | 'en' = 'zh'): Promise<GradingResponse> {
    logger.info(`🎯 Starting AI grading for: ${request.fileName}`);

    // Try Gemini first
    try {
      const geminiService = getSimpleGeminiService();
      const result = await geminiService.gradeDocument(request, userLanguage);

      if (result.success && result.result) {
        logger.info(`✅ Gemini grading succeeded for: ${request.fileName}`);
        return {
          success: true,
          result: result.result,
          provider: 'gemini',
          metadata: result.metadata,
        };
      }

      // Log Gemini failure but don't give up yet
      logger.warn(`⚠️ Gemini failed: ${result.error}, trying OpenAI`);
    } catch (error) {
      logger.warn(`⚠️ Gemini error: ${error instanceof Error ? error.message : 'Unknown'}, trying OpenAI`);
    }

    // Fallback to OpenAI
    try {
      const openaiService = getSimpleOpenAIService();
      const result = await openaiService.gradeDocument(request, userLanguage);

      if (result.success && result.result) {
        logger.info(`✅ OpenAI grading succeeded for: ${request.fileName}`);
        return {
          success: true,
          result: result.result,
          provider: 'openai',
          metadata: result.metadata,
        };
      }

      logger.error(`❌ OpenAI also failed: ${result.error}`);

      return {
        success: false,
        error: `Both AI services failed. Gemini and OpenAI could not grade this document. Please try again later.`,
        provider: 'none',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ OpenAI error: ${errorMessage}`);

      return {
        success: false,
        error: `Both AI services failed with errors. Please check your API keys and try again.`,
        provider: 'none',
      };
    }
  }
}

// Singleton instance
let aiGrader: AIGrader | null = null;

export function getAIGrader(): AIGrader {
  if (!aiGrader) {
    aiGrader = new AIGrader();
  }
  return aiGrader;
}
