import { GoogleGenAI, Type } from '@google/genai';
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';
import { GeminiGradingRequest, GeminiGradingResponse, type GeminiResponse, type GeminiContentPart } from '@/types/gemini';
import type { DbCriterion } from '@/schemas/rubric-data';
import { GeminiPrompts } from './gemini-prompts.server';
import { formatThoughtSummary } from './thought-formatter.server';

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
   * Generate JSON Schema for grading response structure
   * Linus Principle: Let the schema do the work, not prompt text
   * - minItems/maxItems enforce ALL criteria get feedback
   * - required fields enforce structure
   * - descriptions guide, not repeat what's in prompt
   */
  private getGradingResponseSchema(maxScore: number, criteriaCount: number) {
    return {
      type: Type.OBJECT,
      properties: {
        totalScore: {
          type: Type.NUMBER,
          description: '學生的總分',
        },
        maxScore: {
          type: Type.NUMBER,
          description: '滿分',
        },
        breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              criteriaId: {
                type: Type.STRING,
                description: '評分標準的 ID，必須精確匹配提供的 ID',
              },
              name: {
                type: Type.STRING,
                description: '評分標準的名稱',
              },
              score: {
                type: Type.NUMBER,
                description: '此項目得分（0-滿分之間）',
              },
              feedback: {
                type: Type.STRING,
                description: '詳細反饋：引用原文、分析優點、給出改進建議、解釋分數',
              },
            },
            required: ['criteriaId', 'name', 'score', 'feedback'],
          },
          minItems: criteriaCount,
          maxItems: criteriaCount,
          description: `必須包含全部 ${criteriaCount} 個評分標準的反饋`,
        },
        overallFeedback: {
          type: Type.STRING,
          description: '作品整體評價，包括主要優點和改進方向',
        },
      },
      required: ['totalScore', 'maxScore', 'breakdown', 'overallFeedback'],
    };
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
      const maxScore = request.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
      const criteriaCount = request.criteria.length;

      // P3: Use JSON Schema to force structured output with all breakdown items
      const responseSchema = this.getGradingResponseSchema(maxScore, criteriaCount);

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
          // P3: Force structured JSON output with schema validation
          responseMimeType: 'application/json',
          responseSchema,
          // Feature: Enable thinking process for better reasoning
          // Shows AI's internal reasoning to students
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 8192,
          },
        },
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      // Extract thought parts from response
      // Gemini returns thinking in candidates[0].content.parts as separate parts with thought: true
      // Convert SDK response to our GeminiResponse type
      const geminiResponse: GeminiResponse = {
        text: response.text,
        candidates: response.candidates as any, // Type conversion - SDK types differ slightly
      };
      const rawThought = this.extractThoughtSummary(geminiResponse);
      let thoughtSummary: string | undefined;

      if (rawThought) {
        logger.info(`💭 Raw thought summary extracted (${rawThought.length} chars)`);

        // Format thought summary using AI to make it student-friendly
        const formatResult = await formatThoughtSummary({
          rawThought,
          language: userLanguage,
        });

        if (formatResult.success && formatResult.formattedThought) {
          thoughtSummary = formatResult.formattedThought;
          logger.info(`✨ Thought summary formatted successfully (${thoughtSummary.length} chars) using ${formatResult.provider}`);
        } else {
          // If formatting fails, use raw thought as fallback
          thoughtSummary = rawThought;
          logger.warn(`⚠️ Thought formatting failed, using raw version: ${formatResult.error}`);
        }
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
        thoughtSummary,
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

      // Always return fallback result to prevent null in database
      const fallbackResult = this.generateFallbackResult(request.criteria, errorMessage);

      return {
        success: false,
        result: fallbackResult,  // ✅ Include fallback result
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
   * Extract thought summary from Gemini response
   * Gemini returns thinking content in candidates[0].content.parts[] with thought: true
   */
  private extractThoughtSummary(response: GeminiResponse): string | undefined {
    try {
      // Navigate to candidates[0].content.parts
      const candidates = response.candidates;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        logger.warn('No candidates in response');
        return undefined;
      }

      const firstCandidate = candidates[0];
      const content = firstCandidate?.content;
      if (!content) {
        logger.warn('No content in first candidate');
        return undefined;
      }

      const parts = content.parts;
      if (!Array.isArray(parts)) {
        logger.warn('No parts array in content');
        return undefined;
      }

      // Find all thought parts and concatenate their text
      const thoughtParts = parts.filter((part: GeminiContentPart) => part.thought === true && part.text);
      if (thoughtParts.length === 0) {
        logger.info('No thought parts found in response');
        return undefined;
      }

      const thoughtSummary = thoughtParts.map((part: GeminiContentPart) => part.text || '').join('\n\n');
      logger.info(`📍 Extracted ${thoughtParts.length} thought part(s)`);
      return thoughtSummary;
    } catch (error) {
      logger.warn(`Failed to extract thought summary: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
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
   * Generate fallback result structure when grading fails
   * Reusable fallback logic to prevent null results in database
   */
  private generateFallbackResult(criteria: DbCriterion[], errorMessage: string): GradingResultData {
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

    return {
      totalScore: 0,
      maxScore,
      breakdown: criteria.map((criterion) => ({
        criteriaId: criterion.id,
        name: criterion.name,
        score: 0,
        feedback: `Grading failed due to API error: ${errorMessage}`,
      })),
      overallFeedback: `Grading failed. Error: ${errorMessage}. Please try again or contact support.`,
    };
  }

  /**
   * Parse Gemini response - simple and robust
   */
  private parseResponse(responseText: string, criteria: DbCriterion[]): GradingResultData {
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
        parsed.breakdown?.forEach((item: Record<string, unknown>, index: number) => {
          logger.info(
            `  [${index}] criteriaId: ${item.criteriaId}, score: ${item.score}, feedback length: ${typeof item.feedback === 'string' ? item.feedback.length : 0}`
          );
        });
      }

      return {
        totalScore: Math.round(parsed.totalScore || 0),
        maxScore: Math.round(parsed.maxScore || criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0)),
        breakdown: criteria.map((criterion) => {
          const feedbackItem = parsed.breakdown?.find(
            (item: Record<string, unknown>) => item.criteriaId === criterion.id || item.criteriaId === criterion.name
          );

          if (!feedbackItem) {
            logger.warn(`⚠️ Missing feedback for criterion: ${criterion.id} (${criterion.name})`);
          }

          return {
            criteriaId: criterion.id,
            name: criterion.name,
            score: Math.round((feedbackItem?.score as number) || 0),
            feedback: (feedbackItem?.feedback as string) || 'No feedback available',
          };
        }),
        overallFeedback: parsed.overallFeedback || 'No overall feedback provided',
      };
    } catch (error) {
      // Simple fallback - no complex repair logic
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`💥 Parse response error: ${errorMessage}`);

      return this.generateFallbackResult(criteria, `Response parsing error: ${errorMessage}`);
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
