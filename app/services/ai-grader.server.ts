import { getSimpleGeminiService } from './gemini-simple.server';
import { getSimpleOpenAIService } from './openai-simple.server';
import { GradingResultData } from '@/types/grading';
import logger from '@/utils/logger';

export interface GradingRequest {
  content: string;
  criteria: any[];
  fileName: string;
  rubricName: string;
  // Feature 004: AI Grading Context
  referenceDocuments?: Array<{ fileId: string; fileName: string; content: string; wasTruncated: boolean }>;
  customInstructions?: string;
}

export interface GradingResponse {
  success: boolean;
  result?: GradingResultData;
  error?: string;
  provider?: string;
  thoughtSummary?: string | null;
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

    let geminiError: string | null = null;
    let openaiError: string | null = null;

    // Try Gemini first
    try {
      const geminiService = getSimpleGeminiService();
      // Feature 004: Pass language in request object
      const result = await geminiService.gradeDocument({ ...request, language: userLanguage }, userLanguage);

      if (result.success && result.result) {
        logger.info(`✅ Gemini grading succeeded for: ${request.fileName}`);
        return {
          success: true,
          result: result.result,
          thoughtSummary: result.thoughtSummary,
          provider: 'gemini',
          metadata: result.metadata,
        };
      }

      // Log Gemini failure but don't give up yet
      geminiError = result.error || 'Unknown error';
      logger.warn(`⚠️ Gemini failed: ${geminiError}, trying OpenAI`);
    } catch (error) {
      geminiError = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`⚠️ Gemini exception: ${geminiError}, trying OpenAI`);
    }

    // Fallback to OpenAI
    try {
      const openaiService = getSimpleOpenAIService();
      // Feature 004: Pass language in request object
      const result = await openaiService.gradeDocument({ ...request, language: userLanguage }, userLanguage);

      if (result.success && result.result) {
        logger.info(`✅ OpenAI grading succeeded for: ${request.fileName}`);
        return {
          success: true,
          result: result.result,
          provider: 'openai',
          metadata: result.metadata,
        };
      }

      openaiError = result.error || 'Unknown error';
      logger.error(`❌ OpenAI also failed: ${openaiError}`);

      return {
        success: false,
        error: `Both AI services failed. Gemini: ${geminiError} | OpenAI: ${openaiError}`,
        provider: 'none',
      };
    } catch (error) {
      openaiError = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ OpenAI exception: ${openaiError}`);

      return {
        success: false,
        error: `Both AI services failed with exceptions. Gemini: ${geminiError} | OpenAI: ${openaiError}`,
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
