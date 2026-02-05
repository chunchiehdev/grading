/**
 * AI SDK Provider with Health Tracking Integration
 *
 * This service integrates Vercel AI SDK with our existing KeyHealthTracker
 * for intelligent API key selection and distributed health management.
 *
 * Features:
 * - AI SDK unified interface for Gemini and OpenAI
 * - KeyHealthTracker integration for distributed key selection
 * - Automatic health tracking (success/failure recording)
 * - Error classification for proper throttle management
 * - Type-safe structured output with Zod schemas
 *
 * Architecture:
 * - Uses AI SDK's generateObject for type-safe grading
 * - Leverages existing KeyHealthTracker for cross-worker coordination
 * - Maintains compatibility with BullMQ distributed workers
 */

import { generateObject, NoObjectGeneratedError } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import logger from '@/utils/logger';
import { getKeyHealthTracker, type ErrorType } from './gemini-key-health.server';
import { formatThoughtSummary } from './thought-formatter.server';
import { GoogleGenAI } from '@google/genai';
import { GeminiCacheManager } from './gemini-cache.server';

// Zod schema for grading result (matching legacy GradingResultData format)
const CriterionGradeSchema = z.object({
  criteriaId: z.string(),
  name: z.string(),
  score: z.number(),
  feedback: z.string(),
});

const GradingResultSchema = z.object({
  breakdown: z.array(CriterionGradeSchema),
  overallFeedback: z.string(),
  summary: z.string().optional(),
  reasoning: z.string().optional(), // Feature 012: Grading Rationale
  // Sparring Questions for Productive Friction
  sparringQuestions: z.array(z.object({
    related_rubric_id: z.string(),
    target_quote: z.string(),
    provocation_strategy: z.enum(['evidence_check', 'logic_gap', 'counter_argument', 'warrant_probe', 'metacognitive', 'conceptual']),
    question: z.string(),
    ai_hidden_reasoning: z.string(),
  })).optional(),
});

export type AIGradingResult = z.infer<typeof GradingResultSchema>;

interface GradingParams {
  prompt: string;
  userId: string;
  resultId: string;
  temperature?: number;
  language?: 'zh' | 'en';
  contextHash?: string;
  contextContent?: string;
  userPrompt?: string;
}

interface GradingSuccess {
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
  thoughtSummary?: string; // Deprecated
  thinkingProcess?: string; // Feature 012: Raw thinking process
  gradingRationale?: string; // Feature 012: Grading rationale
}

interface GradingFailure {
  success: false;
  error: string;
  provider?: 'gemini' | 'openai';
  keyId?: string;
  rawOutput?: string;
  validationError?: string;
}

export type GradingResult = GradingSuccess | GradingFailure;

/**
 * Classify error type for KeyHealthTracker
 */
function classifyGeminiError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limiting
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
      return 'rate_limit';
    }

    // Service overloaded
    if (message.includes('503') || message.includes('overload') || message.includes('busy')) {
      return 'overloaded';
    }

    // Service unavailable
    if (
      message.includes('unavailable') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return 'unavailable';
    }
  }

  return 'other';
}

/**
 * Get API key by ID
 */
function getApiKeyById(keyId: string): string {
  const keys: Record<string, string | undefined> = {
    '1': process.env.GEMINI_API_KEY,
    '2': process.env.GEMINI_API_KEY2,
    '3': process.env.GEMINI_API_KEY3,
  };

  const key = keys[keyId];
  if (!key) {
    throw new Error(`API key not found for keyId: ${keyId}`);
  }

  return key;
}

/**
 * Check if all 3 Gemini keys are configured
 */
function hasMultipleGeminiKeys(): boolean {
  return !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY2 &&
    process.env.GEMINI_API_KEY3
  );
}

/**
 * Grade with Gemini using AI SDK and KeyHealthTracker
 */
export async function gradeWithGemini(params: GradingParams): Promise<GradingResult> {
  const { prompt, userId, resultId, temperature = 0.3, language = 'zh', contextHash, contextContent, userPrompt } = params;
  const healthTracker = getKeyHealthTracker();

  // Select best key using KeyHealthTracker
  const availableKeyIds = hasMultipleGeminiKeys() ? ['1', '2', '3'] : ['1'];
  const selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);

  if (!selectedKeyId) {
    logger.error('All Gemini keys are throttled', { userId, resultId });
    return {
      success: false,
      error: 'All Gemini API keys are currently throttled. Please try again later.',
      provider: 'gemini',
    };
  }

  const apiKey = getApiKeyById(selectedKeyId);
  
  // Feature: Context Caching
  // If context is provided, try to use/create a cache and use the cached path
  if (contextHash && contextContent) {
    try {
      // Use explicit version suffix for caching as per docs
      const cacheModel = 'gemini-2.5-flash'; 
      const cacheName = await GeminiCacheManager.ensureCache(
        apiKey,
        selectedKeyId,
        contextHash,
        contextContent,
        undefined, // System instruction managed via prompts for now or inside content
        cacheModel
      );

      if (cacheName) {
         return await gradeWithGeminiCached({
           apiKey,
           cacheName,
           model: cacheModel,
           prompt: userPrompt || prompt, // Use userPrompt if available to avoid duplicating context
           userId,
           resultId,
           keyId: selectedKeyId,
           temperature,
           language,
         });
      }
    } catch (error) {
       logger.warn('Failed to use Gemini Context Caching, falling back to standard prompt', {
         userId,
         resultId,
         error: String(error)
       });
       // Fallthrough to standard execution
    }
  }

  const geminiProvider = createGoogleGenerativeAI({ apiKey });
  const startTime = Date.now();

  try {
    logger.info('Grading with Gemini (AI SDK)', {
      userId,
      resultId,
      keyId: selectedKeyId,
      model: 'gemini-2.5-flash',
    });

    // Enable Gemini thinking/reasoning mode
    // Docs: https://ai.google.dev/gemini-api/docs/thinking
    const result = await generateObject({
      model: geminiProvider('gemini-2.5-flash'),
      schema: GradingResultSchema,
      prompt,
      temperature,
      maxRetries: 2, // AI SDK built-in retry
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 8192 as const, // Allow model to think (max tokens for reasoning)
            includeThoughts: true as const, // Include thought summaries in response
          } as const,
        },
      } as const,
    });

    const responseTimeMs = Date.now() - startTime;

    // Record success in KeyHealthTracker
    await healthTracker.recordSuccess(selectedKeyId, responseTimeMs);

    // Debug: Log reasoning details
    const reasoningLength = result.reasoning?.length || 0;
    const hasReasoning = !!result.reasoning;

    logger.info('Gemini grading succeeded', {
      userId,
      resultId,
      keyId: selectedKeyId,
      responseTimeMs,
      usage: result.usage,
      hasReasoning,
      reasoningLength,
    });

    // Log actual reasoning content if available
    let formattedThoughtSummary: string | undefined;

    if (result.reasoning) {
      logger.debug('[AI SDK Reasoning]', {
        resultId,
        reasoning: result.reasoning.substring(0, 500), // First 500 chars
        fullLength: result.reasoning.length,
      });

      // Format the thought summary to make it student-friendly
      const formatResult = await formatThoughtSummary({
        rawThought: result.reasoning,
        language: language || 'zh',
      });

      if (formatResult.success && formatResult.formattedThought) {
        formattedThoughtSummary = formatResult.formattedThought;
        logger.info(`✨ [AI SDK] Thought summary formatted (${formattedThoughtSummary.length} chars) using ${formatResult.provider}`);
      } else {
        // Fallback to raw reasoning if formatting fails
        formattedThoughtSummary = result.reasoning;
        logger.warn(`⚠️ [AI SDK] Thought formatting failed, using raw: ${formatResult.error}`);
      }
    } else {
      logger.warn('[AI SDK] No reasoning returned - thinkingConfig may not be working', {
        resultId,
        providerOptions: 'google.thinkingConfig set',
      });
    }

    return {
      success: true,
      data: result.object,
      usage: {
        promptTokens: result.usage.inputTokens ?? 0,
        completionTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      },
      provider: 'gemini',
      keyId: selectedKeyId,
      responseTimeMs,
      thoughtSummary: formattedThoughtSummary, // Use formatted thought summary
      thinkingProcess: result.reasoning, // Feature 012: Raw thinking process
      gradingRationale: result.object.reasoning, // Feature 012: Grading rationale
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    // Classify error for health tracking
    const errorType = classifyGeminiError(error);
    await healthTracker.recordFailure(selectedKeyId, errorType, String(error));

    // Handle NoObjectGeneratedError specifically
    if (NoObjectGeneratedError.isInstance(error)) {
      logger.error('Gemini failed to generate valid object', {
        userId,
        resultId,
        keyId: selectedKeyId,
        rawOutput: error.text,
        cause: error.cause,
        usage: error.usage,
      });

      return {
        success: false,
        error: 'Failed to generate valid grading result',
        provider: 'gemini',
        keyId: selectedKeyId,
        rawOutput: error.text,
        validationError: String(error.cause),
      };
    }

    logger.error('Gemini grading failed', {
      userId,
      resultId,
      keyId: selectedKeyId,
      errorType,
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Gemini error',
      provider: 'gemini',
      keyId: selectedKeyId,
    };
  }
}



/**
 * Grade using an existing Gemini Context Cache (bypassing AI SDK for the call, using official Client)
 */
async function gradeWithGeminiCached(params: {
  apiKey: string;
  cacheName: string;
  model: string;
  prompt: string;
  userId: string;
  resultId: string;
  keyId: string;
  temperature: number;
  language: string;
}): Promise<GradingResult> {
  const { apiKey, cacheName, model, prompt, userId, resultId, keyId, temperature, language } = params;
  const startTime = Date.now();
  const healthTracker = getKeyHealthTracker();

  try {
    const client = new GoogleGenAI({ apiKey });
    
    logger.info('Grading with Gemini (Cached)', {
      userId,
      resultId,
      keyId,
      cacheName,
      model,
    });

    // Use JSON schema for structured output
    // We can't easily convert Zod to JSON Schema here without a lib, 
    // but we can request JSON responseMimeType and trust the prompt + parsing.
    // Or we rely on the prompt instructing JSON.
    // The prompt explicitly asks for JSON format (GeminiPrompts.getSimpleOutputFormat).
    
    const response = await client.models.generateContent({
      model,
      config: {
        temperature,
        cachedContent: cacheName,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            breakdown: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  criteriaId: { type: 'STRING' },
                  name: { type: 'STRING' },
                  score: { type: 'NUMBER' },
                  feedback: { type: 'STRING' }
                },
                required: ['criteriaId', 'name', 'score', 'feedback']
              }
            },
            overallFeedback: { type: 'STRING' }
          },
          required: ['breakdown', 'overallFeedback']
        }
      },
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const responseTimeMs = Date.now() - startTime;
    await healthTracker.recordSuccess(keyId, responseTimeMs);

    const text = response.text;
    if (!text) {
        throw new Error('Empty response from cached model');
    }

    // Parse JSON
    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        throw new Error('Failed to parse JSON from cached model response');
    }

    // Validate with Zod
    const validation = GradingResultSchema.safeParse(parsed);
    if (!validation.success) {
        throw new Error(`Validation failed: ${validation.error.message}`);
    }
    
    // Success!
    const data = validation.data;
    
    // Usage metadata
    const usage = response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount || 0,
        completionTokens: response.usageMetadata.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata.totalTokenCount || 0,
    } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    logger.info('Gemini cached grading succeeded', {
        userId,
        resultId,
        cacheName,
        usage,
    });
    
    return {
        success: true,
        data,
        usage,
        provider: 'gemini',
        keyId,
        responseTimeMs,
        // Cached path might not support "thinking" field capture unless we request it via config?
        // Gemini 1.5 doesn't have "Thinking" feature like 2.0/2.5 logic?
        // 1.5 Flash is standard. 
        // We can ignore thinkingProcess for cached path or implement it if model supports it.
        // For now, we omit thinkingProcess if not returned.
    };

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorType = classifyGeminiError(error);
    await healthTracker.recordFailure(keyId, errorType, String(error));
    
    logger.error('Gemini cached grading failed', {
        userId,
        resultId,
        keyId,
        cacheName,
        message: (error as any).message,
        status: (error as any).status,
        errorDetails: JSON.stringify(error)
    });
    console.error('Gemini Cached Grading Error:', error);

    return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Gemini Timeout',
        provider: 'gemini',
        keyId,
    };
  }
}

/**
 * Grade with OpenAI using AI SDK (fallback provider)
 */
export async function gradeWithOpenAI(params: GradingParams): Promise<GradingResult> {
  const { prompt, userId, resultId, temperature = 0.1, language = 'zh' } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'OpenAI API key not configured',
      provider: 'openai',
    };
  }

  const openaiProvider = createOpenAI({ apiKey });
  const startTime = Date.now();

  try {
    logger.info('Grading with OpenAI (AI SDK)', {
      userId,
      resultId,
      model: 'gpt-4o-mini',
    });

    const result = await generateObject({
      model: openaiProvider('gpt-4o-mini'),
      schema: GradingResultSchema,
      prompt,
      temperature,
      maxRetries: 2,
    });

    const responseTimeMs = Date.now() - startTime;

    logger.info('OpenAI grading succeeded', {
      userId,
      resultId,
      responseTimeMs,
      usage: result.usage,
      hasReasoning: !!result.reasoning,
    });

    // Format thought summary if available
    let formattedThoughtSummary: string | undefined;

    if (result.reasoning) {
      const formatResult = await formatThoughtSummary({
        rawThought: result.reasoning,
        language,
      });

      if (formatResult.success && formatResult.formattedThought) {
        formattedThoughtSummary = formatResult.formattedThought;
        logger.info(`✨ [OpenAI] Thought summary formatted (${formattedThoughtSummary.length} chars) using ${formatResult.provider}`);
      } else {
        // Fallback to raw reasoning if formatting fails
        formattedThoughtSummary = result.reasoning;
        logger.warn(`⚠️ [OpenAI] Thought formatting failed, using raw: ${formatResult.error}`);
      }
    }

    return {
      success: true,
      data: result.object,
      usage: {
        promptTokens: result.usage.inputTokens ?? 0,
        completionTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      },
      provider: 'openai',
      responseTimeMs,
      thoughtSummary: formattedThoughtSummary, // Use formatted thought summary
      thinkingProcess: result.reasoning, // Feature 012: Raw thinking process
      gradingRationale: result.object.reasoning, // Feature 012: Grading rationale
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    if (NoObjectGeneratedError.isInstance(error)) {
      logger.error('OpenAI failed to generate valid object', {
        userId,
        resultId,
        rawOutput: error.text,
        cause: error.cause,
        usage: error.usage,
      });

      return {
        success: false,
        error: 'Failed to generate valid grading result',
        provider: 'openai',
        rawOutput: error.text,
        validationError: String(error.cause),
      };
    }

    logger.error('OpenAI grading failed', {
      userId,
      resultId,
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
      provider: 'openai',
    };
  }
}
