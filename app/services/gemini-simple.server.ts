import { GoogleGenAI } from '@google/genai';
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';
import { GeminiGradingRequest, GeminiGradingResponse } from '@/types/gemini';
import { GeminiPrompts } from './gemini-prompts.server';

/**
 * Simple, reliable Gemini service following Linus principles:
 * - No special cases
 * - One API key, one client
 * - Fail fast, fail clearly
 * - Let the user decide what to do with failures
 */
class SimpleGeminiService {
  private client: GoogleGenAI;
  private model: string = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.client = new GoogleGenAI({ apiKey });
    logger.info(`🔮 Simple Gemini service initialized with ${this.model}`);
  }

  /**
   * Grade a document - simple and direct
   */
  async gradeDocument(request: GeminiGradingRequest, userLanguage: 'zh' | 'en' = 'zh'): Promise<GeminiGradingResponse> {
    const startTime = Date.now();

    try {
      logger.info(`🎯 Grading ${request.fileName} with Gemini`);

      const prompt = GeminiPrompts.generateTextGradingPrompt(request);
      const systemInstruction = GeminiPrompts.generateSystemInstruction(userLanguage);

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction,
          // Feature: Increased output token limit for detailed feedback
          // From 4000 → 8192 (full capacity for Gemini 2.0 Flash)
          maxOutputTokens: 8192,
          // Feature: Adjusted temperature for better quality feedback
          // From 0.1 → 0.3 (balance consistency with creative suggestions)
          temperature: 0.3,
        },
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      const result = this.parseResponse(response.text, request.criteria);
      const duration = Date.now() - startTime;

      logger.info(`✅ Gemini grading completed in ${duration}ms`);

      // Better token estimation: roughly 1 token per 4 characters (Chinese) or 4 characters (English)
      // Output tokens based on actual response length
      const outputTokens = this.estimateTokens(response.text);

      logger.info(`📊 Output tokens: ${outputTokens}`);

      return {
        success: true,
        result,
        metadata: {
          model: this.model,
          tokens: outputTokens,
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ Gemini grading failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          model: this.model,
          tokens: 0,
          duration,
        },
      };
    }
  }

  /**
   * Estimate tokens in text
   * Better estimation than length/3:
   * - Chinese: ~1 token per 1.5 characters
   * - English: ~1 token per 4 characters
   * - Average: ~1 token per 3.5 characters
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Parse Gemini response - simple and robust
   */
  private parseResponse(responseText: string, criteria: any[]): GradingResultData {
    try {
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleanedText);

      // Diagnostic logging
      const expectedCount = criteria.length;
      const providedCount = parsed.breakdown?.length || 0;
      if (providedCount !== expectedCount) {
        logger.warn(`⚠️ Feedback count mismatch: expected ${expectedCount}, got ${providedCount}`);
        parsed.breakdown?.forEach((item: any, index: number) => {
          logger.info(`  [${index}] criteriaId: ${item.criteriaId}, score: ${item.score}, feedback length: ${item.feedback?.length || 0}`);
        });
      }

      return {
        totalScore: Math.round(parsed.totalScore || 0),
        maxScore: Math.round(parsed.maxScore || criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0)),
        breakdown: criteria.map((criterion) => {
          const feedbackItem = parsed.breakdown?.find(
            (item: any) => item.criteriaId === criterion.id || item.criteriaId === criterion.name
          );

          if (!feedbackItem) {
            logger.warn(`⚠️ Missing feedback for criterion: ${criterion.id} (${criterion.name})`);
          }

          return {
            criteriaId: criterion.id,
            name: criterion.name,
            score: Math.round(feedbackItem?.score || 0),
            feedback: feedbackItem?.feedback || 'No feedback available',
          };
        }),
        overallFeedback: parsed.overallFeedback || 'No overall feedback provided',
      };
    } catch (error) {
      // Simple fallback - no complex repair logic
      const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
      logger.error(`💥 Parse response error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        totalScore: 0,
        maxScore,
        breakdown: criteria.map((criterion) => ({
          criteriaId: criterion.id,
          name: criterion.name,
          score: 0,
          feedback: `Grading failed due to response parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })),
        overallFeedback: 'Grading failed. Please try again or contact support.',
      };
    }
  }
}

// Singleton instance
let geminiService: SimpleGeminiService | null = null;

export function getSimpleGeminiService(): SimpleGeminiService {
  if (!geminiService) {
    geminiService = new SimpleGeminiService();
  }
  return geminiService;
}

export default SimpleGeminiService;
