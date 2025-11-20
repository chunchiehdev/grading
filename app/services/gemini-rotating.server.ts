/**
 * Advanced Multi-Key Gemini Service with Health-Based Rotation
 *
 * This service manages multiple Gemini API keys with automatic rotation and failover:
 * - Loads 3 API keys and creates separate clients
 * - Uses KeyHealthTracker for intelligent key selection
 * - Automatically retries with different keys on rate limits/503 errors
 * - Records success/failure metrics for health scoring
 * - Provides 3x throughput capacity (24 RPM vs 8 RPM single key)
 *
 * Design Principles:
 * - Same interface as SimpleGeminiService (drop-in replacement)
 * - Fail gracefully with clear error messages
 * - Track health metrics for all keys
 * - Respect throttle cooldowns across all workers
 */

import { GoogleGenAI, Type } from '@google/genai';
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';
import {
  GeminiGradingRequest,
  GeminiGradingResponse,
  type GeminiResponse,
  type GeminiContentPart,
} from '@/types/gemini';
import type { DbCriterion } from '@/schemas/rubric-data';
import { GeminiPrompts } from './gemini-prompts.server';
import { getKeyHealthTracker, type ErrorType } from './gemini-key-health.server';

interface KeyClient {
  keyId: string;
  client: GoogleGenAI;
}

/**
 * Rotating Gemini service with multi-key support and health tracking
 */
class RotatingGeminiService {
  private clients: KeyClient[];
  private healthTracker = getKeyHealthTracker();
  private model: string = 'gemini-2.5-flash';
  private maxAttempts: number = 999; // Unlimited attempts until success
  private maxWaitMs: number = 60000; // Max wait 60s between attempts

  constructor() {
    const keys = this.loadApiKeys();

    // Validate all 3 keys are present
    if (keys.length !== 3) {
      throw new Error(
        `RotatingGeminiService requires all 3 API keys. Found: ${keys.length}. ` +
          `Set GEMINI_API_KEY, GEMINI_API_KEY2, and GEMINI_API_KEY3.`
      );
    }

    // Create clients for each key
    this.clients = keys.map((apiKey, index) => ({
      keyId: String(index + 1),
      client: new GoogleGenAI({ apiKey }),
    }));

    // Initialize health tracking for all keys
    this.initializeHealthTracking();

    logger.info(`🔄 Rotating Gemini service initialized with ${this.clients.length} API keys`, {
      model: this.model,
      keyCount: this.clients.length,
    });
  }

  /**
   * Load API keys from environment
   */
  private loadApiKeys(): string[] {
    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY2,
      process.env.GEMINI_API_KEY3,
    ].filter((key): key is string => Boolean(key));

    return keys;
  }

  /**
   * Initialize health tracking for all keys
   */
  private async initializeHealthTracking(): Promise<void> {
    try {
      for (const { keyId } of this.clients) {
        await this.healthTracker.initializeKey(keyId);
      }
      logger.info('  Initialized health tracking for all Gemini keys');
    } catch (error) {
      logger.error('Failed to initialize health tracking', { error });
    }
  }

  /**
   * Generate JSON Schema for grading response structure
   * (Same as SimpleGeminiService for compatibility)
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
   * Detect error type from error message
   */
  private detectErrorType(errorMessage: string): ErrorType {
    const msg = errorMessage.toLowerCase();

    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
      return 'rate_limit';
    }
    if (msg.includes('503') || msg.includes('overloaded')) {
      return 'overloaded';
    }
    if (msg.includes('unavailable') || msg.includes('503')) {
      return 'unavailable';
    }
    return 'other';
  }

  /**
   * Execute grading with a specific key
   */
  private async gradeWithKey(
    keyClient: KeyClient,
    request: GeminiGradingRequest,
    userLanguage: 'zh' | 'en',
    prompt: string,
    systemInstruction: string,
    responseSchema: any
  ) {
    logger.debug(`Attempting grading with key ${keyClient.keyId}`);

    const response = await keyClient.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 8192,
        },
      },
    });

    return response as any as GeminiResponse;
  }

  /**
   * Grade a document with automatic key rotation and failover
   * Same interface as SimpleGeminiService for compatibility
   */
  async gradeDocument(
    request: GeminiGradingRequest,
    userLanguage: 'zh' | 'en' = 'zh'
  ): Promise<GeminiGradingResponse> {
    const startTime = Date.now();
    const attemptedKeys: string[] = [];

    try {
      logger.info(`🎯 Grading ${request.fileName} with Rotating Gemini`, {
        totalKeys: this.clients.length,
      });

      // Prepare request data (same for all attempts)
      const prompt = GeminiPrompts.generateTextGradingPrompt(request);
      const systemInstruction = GeminiPrompts.generateSystemInstruction(userLanguage);
      const maxScore = request.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
      const criteriaCount = request.criteria.length;
      const responseSchema = this.getGradingResponseSchema(maxScore, criteriaCount);

      // Try until success with exponential backoff
      for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
        // Select best available key
        const selectedKeyId = await this.healthTracker.selectBestKey(
          this.clients.map((c) => c.keyId)
        );

        if (!selectedKeyId) {
          // All keys throttled - wait with exponential backoff then retry
          const waitMs = Math.min(Math.pow(2, Math.floor(attempt / 3)) * 1000, this.maxWaitMs);
          logger.warn(`⏳ All keys throttled, waiting ${waitMs}ms before retry ${attempt + 1}`, {
            attemptedKeys,
          });
          await new Promise((r) => setTimeout(r, waitMs));
          continue; // Retry with same attempt
        }

        attemptedKeys.push(selectedKeyId);
        const keyClient = this.clients.find((c) => c.keyId === selectedKeyId);

        if (!keyClient) {
          logger.error(`Key client not found for keyId: ${selectedKeyId}`);
          continue;
        }

        try {
          const keyStartTime = Date.now();

          // Attempt grading with selected key
          const response = await this.gradeWithKey(
            keyClient,
            request,
            userLanguage,
            prompt,
            systemInstruction,
            responseSchema
          );

          const keyDuration = Date.now() - keyStartTime;

          if (!response.text) {
            throw new Error('Empty response from Gemini API');
          }

          // SUCCESS: Parse response and record metrics
          const thoughtSummary = this.extractThoughtSummary(response);
          const result = this.parseResponse(response.text, request.criteria);
          const outputTokens = this.estimateTokens(response.text);
          const totalDuration = Date.now() - startTime;

          // Record success metrics
          await this.healthTracker.recordSuccess(selectedKeyId, keyDuration);

          logger.info(`  Gemini grading completed with key ${selectedKeyId}`, {
            duration: totalDuration,
            keyUsed: selectedKeyId,
            attempts: attempt + 1,
            tokens: outputTokens,
          });

          return {
            success: true,
            result,
            thoughtSummary,
            metadata: {
              model: this.model,
              tokens: outputTokens,
              duration: totalDuration,
              keyUsed: selectedKeyId,
              attempts: attempt + 1,
            },
          };
        } catch (keyError) {
          const errorMessage = keyError instanceof Error ? keyError.message : 'Unknown error';
          const errorType = this.detectErrorType(errorMessage);

          logger.warn(`⚠️ Key ${selectedKeyId} failed (attempt ${attempt + 1})`, {
            errorType,
            errorMessage,
          });

          // Record failure and throttle if needed
          await this.healthTracker.recordFailure(selectedKeyId, errorType, errorMessage);

          // Always retry - never give up
          logger.info(`🔄 Rotating to next available key...`);
          continue;
        }
      }

      // Should never reach here after 999 attempts
      throw new Error('Exhausted all retry attempts without success');
    } catch (error) {
      // Should never reach here with unlimited retry
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ Rotating Gemini exhausted all attempts (SHOULD NEVER HAPPEN)`, {
        attemptedKeys,
        error: errorMessage,
        duration,
        maxAttempts: this.maxAttempts,
      });

      // This should never execute with maxAttempts=999
      throw new Error(`Critical: Gemini rotation failed after ${this.maxAttempts} attempts: ${errorMessage}`);
    }
  }

  /**
   * Extract thought summary from Gemini response
   * (Same as SimpleGeminiService for compatibility)
   */
  private extractThoughtSummary(response: GeminiResponse): string | undefined {
    try {
      const candidates = response.candidates;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return undefined;
      }

      const firstCandidate = candidates[0];
      const content = firstCandidate?.content;
      if (!content) {
        return undefined;
      }

      const parts = content.parts;
      if (!Array.isArray(parts)) {
        return undefined;
      }

      const thoughtParts = parts.filter(
        (part: GeminiContentPart) => part.thought === true && part.text
      );
      if (thoughtParts.length === 0) {
        return undefined;
      }

      return thoughtParts.map((part: GeminiContentPart) => part.text || '').join('\n\n');
    } catch (error) {
      logger.warn(
        `Failed to extract thought summary: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /**
   * Estimate tokens in text
   * (Same as SimpleGeminiService for compatibility)
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
   * Parse Gemini response
   * (Same as SimpleGeminiService for compatibility)
   */
  private parseResponse(responseText: string, criteria: DbCriterion[]): GradingResultData {
    try {
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleanedText);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure');
      }

      return parsed as GradingResultData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to parse Gemini response: ${errorMessage}`);

      // Return fallback result instead of throwing
      return this.generateFallbackResult(criteria, `Response parsing error: ${errorMessage}`);
    }
  }

  /**
   * Get current health status for all keys (for monitoring)
   */
  async getHealthStatus() {
    return this.healthTracker.getAllMetrics(this.clients.map((c) => c.keyId));
  }

  /**
   * Get summary statistics (for monitoring)
   */
  async getSummaryStats() {
    return this.healthTracker.getSummaryStats(this.clients.map((c) => c.keyId));
  }
}

// Singleton instance
let rotatingServiceInstance: RotatingGeminiService | null = null;

/**
 * Get singleton instance of RotatingGeminiService
 * Throws error if all 3 keys are not configured
 */
export function getRotatingGeminiService(): RotatingGeminiService {
  if (!rotatingServiceInstance) {
    rotatingServiceInstance = new RotatingGeminiService();
  }
  return rotatingServiceInstance;
}

/**
 * Check if rotation can be enabled (all 3 keys present)
 */
export function canUseRotation(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY2 && process.env.GEMINI_API_KEY3
  );
}
