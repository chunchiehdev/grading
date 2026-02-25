/**
 * AI Grader using Vercel AI SDK
 *
 * This is the main grading service that replaces the old ai-grader.server.ts,
 * gemini-simple.server.ts, gemini-rotating.server.ts, and openai-simple.server.ts.
 *
 * Key improvements over the old system:
 * - Unified AI SDK interface for all providers
 * - Type-safe structured output with Zod schemas
 * - Integrated with existing KeyHealthTracker for distributed coordination
 * - Simpler fallback logic (Gemini → OpenAI)
 * - Better error handling and logging
 * - Reduced code complexity (~200 lines vs 633 lines)
 *
 * Architecture:
 * 1. Try Gemini with health-based key selection
 * 2. On failure, fallback to OpenAI
 * 3. Return detailed error if both fail
 *
 * Usage:
 * ```typescript
 * const result = await gradeWithAI({
 *   prompt: gradingPrompt,
 *   userId: 'user-123',
 *   resultId: 'result-456',
 * });
 *
 * if (result.success) {
 *   console.log(result.data.criteriaGrades);
 * }
 * ```
 */

import logger from '@/utils/logger';
import {
  gradeWithGemini,
  gradeWithOpenAI,
  type GradingResult,
  type AIGradingResult,
} from './ai-sdk-provider.server';

export interface GradeWithAIParams {
  prompt: string;
  userId: string;
  resultId: string;
  temperature?: number;
  /**
   * If true, skip OpenAI fallback and return immediately on Gemini failure
   */
  skipFallback?: boolean;
  /**
   * User language for formatting thought summary
   */
  language?: 'zh' | 'en';
  /**
   * Optional context hash for caching
   */
  contextHash?: string;
  /**
   * Optional cached content (if created externally, but usually we pass the hash and let the provider handle it)
   * Actually, let's pass the raw context content so the provider can create the cache if needed.
   */
  contextContent?: string;
  /**
   * Optional user prompt (dynamic part only) when using caching.
   * If provided, cached path uses this instead of full prompt to avoid duplication.
   */
  userPrompt?: string;
}

export interface GradeWithAISuccess {
  success: true;
  data: AIGradingResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: 'gemini' | 'openai';
  keyId?: string;
  responseTimeMs: number;
  thoughtSummary?: string;
  thinkingProcess?: string; // Feature 012: Raw thinking process
  gradingRationale?: string; // Feature 012: Grading rationale
}

export interface GradeWithAIFailure {
  success: false;
  error: string;
  geminiError?: string;
  openaiError?: string;
  rawOutput?: string;
}

export type GradeWithAIResult = GradeWithAISuccess | GradeWithAIFailure;

/**
 * Grade student work using AI with automatic Gemini → OpenAI fallback
 *
 * This is the main entry point for AI grading in the system.
 * It will:
 * 1. Try Gemini with intelligent key selection (via KeyHealthTracker)
 * 2. On Gemini failure, automatically fallback to OpenAI
 * 3. Return detailed error information if both providers fail
 *
 * @param params Grading parameters
 * @returns Grading result with success/failure status
 */
export async function gradeWithAI(params: GradeWithAIParams): Promise<GradeWithAIResult> {
  const { prompt, userId, resultId, temperature, skipFallback = false, language = 'zh', contextHash, contextContent, userPrompt } = params;

  logger.info({
    userId,
    resultId,
    promptLength: prompt.length,
    language,
    contextHash,
    contextContent: !!contextContent, // Log presence only
  }, 'Starting AI grading');

  // Step 1: Try Gemini (with KeyHealthTracker)
  const geminiResult = await gradeWithGemini({
    prompt,
    userId,
    resultId,
    temperature,
    language,
    contextHash,
    contextContent,
    userPrompt,
  });

  if (geminiResult.success) {
    logger.info({
      userId,
      resultId,
      provider: 'gemini',
      keyId: geminiResult.keyId,
      responseTimeMs: geminiResult.responseTimeMs,
    }, 'Grading completed successfully with Gemini');

    return geminiResult;
  }

  // Gemini failed
  logger.warn({
    userId,
    resultId,
    error: geminiResult.error,
  }, 'Gemini grading failed, preparing fallback');

  // Check if fallback is disabled
  if (skipFallback) {
    logger.error({
      userId,
      resultId,
    }, 'Gemini failed and fallback is disabled');

    return {
      success: false,
      error: geminiResult.error,
      geminiError: geminiResult.error,
    };
  }

  // Step 2: Fallback to OpenAI
  logger.info({ userId, resultId }, 'Falling back to OpenAI');

  const openaiResult = await gradeWithOpenAI({
    prompt,
    userId,
    resultId,
    temperature,
    language,
  });

  if (openaiResult.success) {
    logger.info({
      userId,
      resultId,
      provider: 'openai',
      responseTimeMs: openaiResult.responseTimeMs,
    }, 'Grading completed successfully with OpenAI (fallback)');

    return openaiResult;
  }

  // Both providers failed
  logger.error({
    userId,
    resultId,
    geminiError: geminiResult.error,
    openaiError: openaiResult.error,
  }, 'Both Gemini and OpenAI failed');

  return {
    success: false,
    error: 'Both Gemini and OpenAI providers failed to grade the submission.',
    geminiError: geminiResult.error,
    openaiError: openaiResult.error,
    rawOutput: geminiResult.rawOutput || openaiResult.rawOutput,
  };
}

/**
 * Convert AIGradingResult to legacy GradingResultData format
 *
 * This is a compatibility layer to ensure the new AI SDK grading
 * works with existing code that expects the old format.
 *
 * Note: AI SDK result already matches legacy format (breakdown, overallFeedback),
 * so this is essentially a pass-through with type conversion.
 */
export function convertToLegacyFormat(
  aiResult: AIGradingResult
): {
  breakdown: Array<{
    criteriaId: string;
    name: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string;
  summary?: string;
} {
  return {
    breakdown: aiResult.breakdown,
    overallFeedback: aiResult.overallFeedback,
    summary: aiResult.summary,
  };
}

/**
 * Check if AI SDK grading is enabled via feature flag
 */
export function isAISDKGradingEnabled(): boolean {
  return process.env.USE_AI_SDK_GRADING === 'true';
}

/**
 * Get grading provider status for health monitoring
 */
export async function getGradingProviderStatus(): Promise<{
  geminiAvailable: boolean;
  geminiKeyCount: number;
  openaiAvailable: boolean;
}> {
  const geminiKeyCount = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3,
  ].filter(Boolean).length;

  return {
    geminiAvailable: geminiKeyCount > 0,
    geminiKeyCount,
    openaiAvailable: !!process.env.OPENAI_API_KEY,
  };
}
