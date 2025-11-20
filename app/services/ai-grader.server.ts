import { getSimpleGeminiService } from './gemini-simple.server';
import { getRotatingGeminiService, canUseRotation } from './gemini-rotating.server';
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
 * Advanced AI grader with 2-tier fallback and optional multi-key rotation
 * - Uses RotatingGeminiService if all 3 keys present (3x throughput + resilience)
 * - Falls back to SimpleGeminiService if only 1 key configured
 * - Falls back to OpenAI if Gemini fails
 */
export class AIGrader {
  /**
   * Grade a document using AI with intelligent service selection
   *
   * Service Selection Logic:
   * 1. If all 3 Gemini keys configured → Use RotatingGeminiService (3x capacity)
   * 2. If only 1 Gemini key configured → Use SimpleGeminiService (1x capacity)
   * 3. If Gemini fails → Fallback to OpenAI
   */
  async grade(request: GradingRequest, userLanguage: 'zh' | 'en' = 'zh'): Promise<GradingResponse> {
    const useRotation = canUseRotation();

    logger.info(`🎯 Starting AI grading for: ${request.fileName}`, {
      rotationEnabled: useRotation,
    });

    let geminiError: string | null = null;
    let openaiError: string | null = null;

    // Try Gemini first (with rotation if available)
    try {
      // Select service based on configuration
      const geminiService = useRotation ? getRotatingGeminiService() : getSimpleGeminiService();

      logger.info(`Using ${useRotation ? 'Rotating' : 'Simple'} Gemini service`);

      // Feature 004: Pass language in request object
      const result = await geminiService.gradeDocument({ ...request, language: userLanguage }, userLanguage);

      if (result.success && result.result) {
        logger.info(`  Gemini grading succeeded for: ${request.fileName}`);
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
        logger.info(`  OpenAI grading succeeded for: ${request.fileName}`);
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
