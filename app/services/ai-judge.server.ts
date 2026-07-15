/**
 * Multi-Model LLM Judge
 *
 * Runs the same submission through Gemini + OpenAI + Claude in parallel,
 * takes the median score per criterion, and merges the three feedbacks into one.
 *
 * Why: addresses inter-rater reliability concerns raised in oral defense by
 * cross-validating across model vendors instead of repeating one model 3x.
 *
 * Gated behind USE_MULTI_MODEL_JUDGE=true. Off → falls back to legacy single-model path.
 */

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

import { getSimpleGeminiService } from './gemini-simple.server';
import { getRotatingGeminiService, canUseRotation } from './gemini-rotating.server';
import { getSimpleOpenAIService } from './openai-simple.server';
import logger from '@/utils/logger';
import type { GradingRequest, GradingResponse } from './ai-grader.server';
import type { GradingResultData } from '@/types/grading';

type ProviderId = 'gemini' | 'openai' | 'anthropic';

interface JudgeAttempt {
  provider: ProviderId;
  success: boolean;
  result?: GradingResultData;
  error?: string;
  durationMs: number;
}

export interface JudgeMetadata {
  attempts: JudgeAttempt[];
  consensus: {
    perCriterionMaxMinusMin: Record<string, number>;
    anyCriterionDiverged: boolean;
  };
  mergedFrom: ProviderId[];
}

const ARBITRATION_THRESHOLD = 2; // criterion-level max-minus-min triggering merge

const claudeModel = 'claude-haiku-4-5-20251001'; // cheapest current Claude

const ClaudeGradingSchema = z.object({
  totalScore: z.number(),
  maxScore: z.number(),
  breakdown: z.array(
    z.object({
      criteriaId: z.string(),
      score: z.number(),
      feedback: z.string(),
    })
  ),
  overallFeedback: z.string(),
});

function buildClaudePrompt(req: GradingRequest): string {
  return `Grade the document based on the rubric criteria. Reply with valid JSON only.

Document: ${req.fileName}
Rubric: ${req.rubricName}

Content:
${req.content}

Criteria:
${JSON.stringify(req.criteria, null, 2)}

Output JSON shape:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": [{"criteriaId": "<id>", "score": <number>, "feedback": "<analysis then justification>"}],
  "overallFeedback": "<2-4 warm sentences>"
}

Cite original text evidence in feedback. Analyze first, then score.`;
}

async function gradeWithClaude(req: GradingRequest): Promise<JudgeAttempt> {
  const t0 = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { provider: 'anthropic', success: false, error: 'ANTHROPIC_API_KEY not set', durationMs: 0 };
  }

  try {
    const anthropic = createAnthropic({ apiKey });
    const { text } = await generateText({
      model: anthropic(claudeModel),
      prompt: buildClaudePrompt(req),
      temperature: 0.3,
    });

    // ponytail: regex JSON extraction handles fence wrapping; upgrade to generateObject if Claude drifts
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const parsed = ClaudeGradingSchema.parse(JSON.parse(jsonMatch[0]));

    const maxScore = req.criteria.reduce((sum: number, c: { maxScore?: number }) => sum + (c.maxScore || 0), 0);

    const result: GradingResultData = {
      totalScore: Math.round(parsed.totalScore),
      maxScore: Math.round(parsed.maxScore || maxScore),
      breakdown: req.criteria.map((c: { id: string; name: string }) => {
        const item = parsed.breakdown.find((b) => b.criteriaId === c.id || b.criteriaId === c.name);
        return {
          criteriaId: c.id,
          name: c.name,
          score: Math.round(item?.score ?? 0),
          feedback: item?.feedback ?? 'No feedback available',
        };
      }),
      overallFeedback: parsed.overallFeedback,
    };

    return { provider: 'anthropic', success: true, result, durationMs: Date.now() - t0 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Claude error';
    logger.warn(`Claude grading failed: ${message}`);
    return { provider: 'anthropic', success: false, error: message, durationMs: Date.now() - t0 };
  }
}

async function gradeWithGemini(req: GradingRequest, lang: 'zh' | 'en'): Promise<JudgeAttempt> {
  const t0 = Date.now();
  try {
    const service = canUseRotation() ? getRotatingGeminiService() : getSimpleGeminiService();
    const res = await service.gradeDocument({ ...req, language: lang }, lang);
    if (res.success && res.result) {
      return { provider: 'gemini', success: true, result: res.result, durationMs: Date.now() - t0 };
    }
    return {
      provider: 'gemini',
      success: false,
      error: res.error || 'Unknown Gemini error',
      durationMs: Date.now() - t0,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    return { provider: 'gemini', success: false, error: message, durationMs: Date.now() - t0 };
  }
}

async function gradeWithOpenAI(req: GradingRequest, lang: 'zh' | 'en'): Promise<JudgeAttempt> {
  const t0 = Date.now();
  try {
    const service = getSimpleOpenAIService();
    const res = await service.gradeDocument({ ...req, language: lang }, lang);
    if (res.success && res.result) {
      return { provider: 'openai', success: true, result: res.result, durationMs: Date.now() - t0 };
    }
    return {
      provider: 'openai',
      success: false,
      error: res.error || 'Unknown OpenAI error',
      durationMs: Date.now() - t0,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
    return { provider: 'openai', success: false, error: message, durationMs: Date.now() - t0 };
  }
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function aggregateScores(successful: JudgeAttempt[]): {
  breakdown: GradingResultData['breakdown'];
  totalScore: number;
  maxScore: number;
  perCriterionMaxMinusMin: Record<string, number>;
} {
  const first = successful[0].result;
  if (!first) throw new Error('aggregateScores called with no successful results');

  const breakdown = first.breakdown.map((c) => {
    const scores = successful
      .map((a) => a.result?.breakdown.find((b) => b.criteriaId === c.criteriaId)?.score)
      .filter((s): s is number => typeof s === 'number');

    const med = Math.round(median(scores));
    return { criteriaId: c.criteriaId, name: c.name, score: med, feedback: c.feedback };
  });

  const perCriterionMaxMinusMin: Record<string, number> = {};
  for (const c of first.breakdown) {
    const scores = successful
      .map((a) => a.result?.breakdown.find((b) => b.criteriaId === c.criteriaId)?.score)
      .filter((s): s is number => typeof s === 'number');
    perCriterionMaxMinusMin[c.criteriaId] = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
  }

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);
  const maxScore = first.maxScore;

  return { breakdown, totalScore, maxScore, perCriterionMaxMinusMin };
}

async function mergeFeedback(
  successful: JudgeAttempt[],
  lang: 'zh' | 'en',
  apiKey: string | undefined
): Promise<string> {
  const feedbacks = successful.map((a) => {
    const fb = a.result?.overallFeedback;
    return typeof fb === 'string' ? fb : JSON.stringify(fb);
  });

  // Single feedback → no merge needed
  if (feedbacks.length === 1) return feedbacks[0];

  // ponytail: USC merge via Claude (cheapest); fallback to first feedback if Claude unavailable
  if (!apiKey) return feedbacks[0];

  const mergePrompt =
    lang === 'zh'
      ? `以下是三位 AI 評審對同一份學生作業的回饋。請整合三者共同提到的重點，重寫成一段給學生看的回饋（3-5 句）。只整合共同提及之處，不要新增資訊。

回饋 1：${feedbacks[0]}
回饋 2：${feedbacks[1] ?? ''}
回饋 3：${feedbacks[2] ?? ''}

整合後的回饋：`
      : `Below are three AI reviewers' feedback on the same student work. Merge their shared points into one student-facing feedback (3-5 sentences). Only consolidate shared points; do not invent new information.

Feedback 1: ${feedbacks[0]}
Feedback 2: ${feedbacks[1] ?? ''}
Feedback 3: ${feedbacks[2] ?? ''}

Merged feedback:`;

  try {
    const anthropic = createAnthropic({ apiKey });
    const { text } = await generateText({
      model: anthropic(claudeModel),
      prompt: mergePrompt,
      temperature: 0.3,
    });
    return text.trim();
  } catch (error: unknown) {
    logger.warn(
      `Feedback merge failed, falling back to first attempt: ${error instanceof Error ? error.message : 'unknown'}`
    );
    return feedbacks[0];
  }
}

/**
 * Run multi-model judge: three providers in parallel, median score, merged feedback.
 * Returns same shape as AIGrader.grade() so it drop-in replaces it.
 */
export async function gradeWithJudge(
  request: GradingRequest,
  userLanguage: 'zh' | 'en' = 'en'
): Promise<GradingResponse & { judgeMetadata?: JudgeMetadata }> {
  logger.info(`🧑‍⚖️ Multi-model judge starting for: ${request.fileName}`);

  const [geminiResult, openaiResult, claudeResult] = await Promise.all([
    gradeWithGemini(request, userLanguage),
    gradeWithOpenAI(request, userLanguage),
    gradeWithClaude(request),
  ]);

  const attempts: JudgeAttempt[] = [geminiResult, openaiResult, claudeResult];
  const successful = attempts.filter((a) => a.success && a.result);

  if (successful.length === 0) {
    const errors = attempts.map((a) => `${a.provider}: ${a.error}`).join(' | ');
    logger.error(`❌ All three judges failed: ${errors}`);
    return { success: false, error: `All judges failed. ${errors}`, provider: 'none' };
  }

  const { breakdown, totalScore, maxScore, perCriterionMaxMinusMin } = aggregateScores(successful);
  const anyCriterionDiverged = Object.values(perCriterionMaxMinusMin).some((d) => d >= ARBITRATION_THRESHOLD);

  // Pick sparring questions from gemini if available, else first successful — full integration deferred to S2
  const sparringSource =
    attempts.find((a) => a.provider === 'gemini' && a.success && a.result?.sparringQuestions?.length)?.result ??
    successful[0].result!;
  const sparringQuestions = sparringSource.sparringQuestions ?? [];

  const overallFeedback = await mergeFeedback(successful, userLanguage, process.env.ANTHROPIC_API_KEY);

  const judgeMetadata: JudgeMetadata = {
    attempts,
    consensus: { perCriterionMaxMinusMin, anyCriterionDiverged },
    mergedFrom: successful.map((a) => a.provider),
  };

  logger.info(
    `🧑‍⚖️ Judge done: ${successful.length}/3 successful, diverged=${anyCriterionDiverged}, merged=${successful.map((a) => a.provider).join('+')}`
  );

  return {
    success: true,
    result: { totalScore, maxScore, breakdown, overallFeedback, sparringQuestions },
    provider: 'multi-model-judge',
    metadata: {
      model: `gemini+openai+claude(${claudeModel})`,
      successCount: successful.length,
      diverged: anyCriterionDiverged,
    },
    judgeMetadata,
  };
}

export function isMultiModelJudgeEnabled(): boolean {
  return process.env.USE_MULTI_MODEL_JUDGE === 'true';
}
