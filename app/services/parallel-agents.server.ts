/**
 * Parallel Multi-Model Agents (spec 020)
 *
 * Runs executeGradingAgent in parallel against Gemini / OpenAI / Anthropic,
 * aggregates by criterion-level median, and merges the three overall feedbacks
 * via Universal Self-Consistency (USC, Wang et al. ICML 2024).
 *
 * Gated by USE_PARALLEL_AGENTS=true. Off → grading-engine stays on single Gemini Agent.
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '@/types/database';
import { Prisma } from '@/generated/prisma/client/client';
import { redis } from '@/lib/redis';
import logger from '@/utils/logger';
import { executeGradingAgent } from './agent-executor.server';
import {
  JUDGE_MODEL_NAMES,
  type JudgeProvider,
  type AgentGradingParams,
  type AgentGradingResult,
  type ParsedCriterion,
} from '@/types/agent';
import type { GradingResultData, SparringQuestion } from '@/types/grading';

// ============================================================================
// TYPES
// ============================================================================

export interface ParallelAgentAttempt {
  provider: JudgeProvider;
  modelName: string;
  success: boolean;
  agentResult?: AgentGradingResult;
  error?: string;
  durationMs: number;
}

export interface ConsensusMetrics {
  perCriterionMaxMinusMin: Record<string, number>;
  anyCriterionDiverged: boolean;
  medianTotal: number;
}

export interface ParallelAgentResult {
  attempts: ParallelAgentAttempt[];
  aggregated: {
    breakdown: GradingResultData['breakdown'];
    totalScore: number;
    maxScore: number;
    overallFeedback: string;
    sparringQuestions: SparringQuestion[];
    consensus: ConsensusMetrics;
    successfulProviders: JudgeProvider[];
  } | null;
}

const DEFAULT_PROVIDERS: JudgeProvider[] = ['gemini', 'openai', 'anthropic'];
const DIVERGENCE_THRESHOLD = 2; // criterion max-min ≥ 2 → flagged

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Aggregate per-criterion scores by median.
 *
 * IMPORTANT: We match by INDEX in the breakdown array, not by criteriaId, because
 * different providers (OpenAI especially) tend to rewrite/renumber criteriaId
 * despite the original rubric having stable UUIDs. The agent system prompt asks
 * them to preserve IDs but compliance is uneven. Index matching is robust as long
 * as each provider iterates the same rubric in the same order — which they do
 * because the prompt feeds the criteria array in fixed order.
 *
 * Canonical criteriaId / name / maxScore come from the original rubric (params.criteria),
 * not from any single provider's output.
 */
function aggregateBreakdownByMedian(
  successful: ParallelAgentAttempt[],
  originalCriteria: ParsedCriterion[]
): {
  breakdown: GradingResultData['breakdown'];
  totalScore: number;
  maxScore: number;
  perCriterionMaxMinusMin: Record<string, number>;
} {
  const getScoresAt = (idx: number): number[] =>
    successful
      .map((a) => a.agentResult?.data?.breakdown?.[idx]?.score)
      .filter((s): s is number => typeof s === 'number');

  const breakdown = originalCriteria.map((c, idx) => {
    const scores = getScoresAt(idx);
    const med = scores.length > 0 ? Math.round(median(scores)) : 0;
    return {
      criteriaId: c.criteriaId,
      name: c.name,
      score: med,
      // ponytail: per-criterion feedback would itself need USC merge; punt to Phase 4. For now show Gemini's per-criterion feedback if present.
      feedback: successful[0].agentResult?.data?.breakdown?.[idx]?.feedback ?? '',
    };
  });

  const perCriterionMaxMinusMin: Record<string, number> = {};
  originalCriteria.forEach((c, idx) => {
    const scores = getScoresAt(idx);
    perCriterionMaxMinusMin[c.criteriaId] = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
  });

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);
  const maxScore = originalCriteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

  return { breakdown, totalScore, maxScore, perCriterionMaxMinusMin };
}

function pickSparringQuestions(successful: ParallelAgentAttempt[]): SparringQuestion[] {
  // Prefer Gemini's sparring set (most mature prompt today); fall back to first successful.
  const fromGemini = successful.find((a) => a.provider === 'gemini')?.agentResult?.data;
  const source = fromGemini ?? successful[0].agentResult?.data;
  return (source?.sparringQuestions as SparringQuestion[] | undefined) ?? [];
}

/**
 * Universal Self-Consistency merge: feed the three overallFeedbacks to Claude Haiku
 * and ask it to consolidate the shared points. Falls back to the first feedback on failure.
 * Cheapest model wins because the merge task is simple.
 */
async function mergeFeedbackUSC(successful: ParallelAgentAttempt[], language: 'zh' | 'en'): Promise<string> {
  const feedbacks = successful
    .map((a) => {
      const fb = a.agentResult?.data?.overallFeedback;
      return typeof fb === 'string' ? fb : fb ? JSON.stringify(fb) : '';
    })
    .filter((s) => s.length > 0);

  if (feedbacks.length === 0) return '';
  if (feedbacks.length === 1) return feedbacks[0];

  // spec 020: USC merger uses Gemini Flash because its raw evaluator voice differs
  // most from Anthropic / OpenAI in our setup. Picking Gemini as merger pulls the
  // output AWAY from any single raw feedback rather than reinforcing it.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('[ParallelAgents] GEMINI_API_KEY missing, using first feedback for merge');
    return feedbacks[0];
  }

  // spec 020: the merger is also one of the evaluators, so it has self-preference bias.
  // Explicit instructions force genuine synthesis rather than rephrasing its own feedback.
  const prompt =
    language === 'zh'
      ? `以下是三份匿名 AI 評審對同一份學生作業的回饋。你的任務是「**合成**」一段給學生看的整合回饋，不是「複製其中一份」。

嚴格規則：
1. 只保留**至少兩份回饋都明確提到**的具體事實或建議，模糊或單份獨有的觀點直接捨棄
2. 用**全新的中性敘述**重寫，不可照抄任何一份的句子或措辭
3. **不要**加 markdown 標題、項目符號、強調符號（** *）
4. 直接輸出 3–5 句純文字段落，第一個字就是給學生的回饋內容
5. 語氣溫暖像老師對學生說話

回饋 A：${feedbacks[0]}

回饋 B：${feedbacks[1] ?? ''}

回饋 C：${feedbacks[2] ?? ''}

整合（純文字段落）：`
      : `Below are three anonymous AI reviewers' feedback on the same student submission. Your task is to **synthesize** one student-facing paragraph — not to copy any single one.

Strict rules:
1. Keep only specific facts or suggestions mentioned by **at least two** of the three reviewers. Drop single-source or vague points.
2. Rewrite in **neutral, fresh phrasing**. Do not copy sentences or wording from any input verbatim.
3. **Do NOT** add markdown headings, bullets, or bold markers (** *).
4. Output 3–5 sentences as plain prose. First character is the start of the student-facing message.
5. Warm, mentor-like tone.

Feedback A: ${feedbacks[0]}

Feedback B: ${feedbacks[1] ?? ''}

Feedback C: ${feedbacks[2] ?? ''}

Synthesis (plain paragraph):`;

  try {
    const gemini = createGoogleGenerativeAI({ apiKey });
    const { text } = await generateText({
      model: gemini(JUDGE_MODEL_NAMES.gemini),
      prompt,
      temperature: 0.3,
    });
    // Strip any stray markdown headings or wrapping the model still emits despite the prompt.
    return text
      .trim()
      .replace(/^#{1,6}\s.*\n+/m, '')
      .trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    logger.warn(`[ParallelAgents] USC merge failed, using first feedback: ${message}`);
    return feedbacks[0];
  }
}

// ============================================================================
// DB PERSISTENCE
// ============================================================================

/**
 * Write all attempts (success or fail) into judge_attempts table, and
 * set GradingResult.consensusMetrics / isMultiModelJudged.
 */
async function persistAttempts(
  resultId: string,
  attempts: ParallelAgentAttempt[],
  consensus: ConsensusMetrics | null
): Promise<void> {
  try {
    await db.judgeAttempt.createMany({
      data: attempts.map((a) => ({
        gradingResultId: resultId,
        provider: a.provider,
        modelName: a.modelName,
        success: a.success,
        result:
          a.success && a.agentResult?.data ? (a.agentResult.data as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        agentSteps:
          a.success && a.agentResult?.steps ? (a.agentResult.steps as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        confidenceScore: a.agentResult?.confidenceScore ?? null,
        errorMessage: a.error ?? null,
        durationMs: a.durationMs,
        // ponytail: inputTokens / outputTokens not exposed by AgentGradingResult yet; track totalTokens only at agent level
        inputTokens: null,
        outputTokens: a.agentResult?.totalTokens ?? null,
      })),
    });

    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        isMultiModelJudged: true,
        consensusMetrics: consensus ? (consensus as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (error) {
    logger.error({ err: error, resultId }, '[ParallelAgents] Failed to persist judge attempts');
  }
}

// ============================================================================
// PUBLIC ENTRY POINTS
// ============================================================================

export function isParallelAgentsEnabled(): boolean {
  return process.env.USE_PARALLEL_AGENTS === 'true';
}

/**
 * Convert a ParallelAgentResult into an AgentGradingResult shape so the existing
 * grading-engine downstream code (which expects a single agent's output) can
 * keep working unchanged. We use Gemini as the canonical "steps" source because
 * the downstream thinkingProcess / gradingRationale extraction is tuned to its
 * tool naming.
 */
export function synthesizeAgentResultFromParallel(p: ParallelAgentResult): AgentGradingResult {
  if (!p.aggregated) {
    const errors = p.attempts.map((a) => `${a.provider}: ${a.error ?? 'unknown'}`).join(' | ');
    return {
      success: false,
      steps: [],
      confidenceScore: 0,
      requiresReview: true,
      totalTokens: 0,
      executionTimeMs: 0,
      error: `All providers failed. ${errors}`,
    };
  }

  const successful = p.attempts.filter((a) => a.success && a.agentResult?.data);
  const geminiAttempt = successful.find((a) => a.provider === 'gemini') ?? successful[0];

  const confidences = successful
    .map((a) => a.agentResult?.confidenceScore)
    .filter((c): c is number => typeof c === 'number');
  const avgConfidence = confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : 0;

  const totalTokens = successful.reduce((s, a) => s + (a.agentResult?.totalTokens ?? 0), 0);
  const executionTimeMs = Math.max(...successful.map((a) => a.durationMs));

  // ponytail: requiresReview triggers when scores diverged OR confidence dipped — both real review signals
  const requiresReview = p.aggregated.consensus.anyCriterionDiverged || avgConfidence < 0.7;

  return {
    success: true,
    data: {
      breakdown: p.aggregated.breakdown,
      overallFeedback: p.aggregated.overallFeedback,
      sparringQuestions: p.aggregated.sparringQuestions,
    } as AgentGradingResult['data'],
    steps: geminiAttempt?.agentResult?.steps ?? [],
    confidenceScore: avgConfidence,
    requiresReview,
    totalTokens,
    executionTimeMs,
    toolCallStats: geminiAttempt?.agentResult?.toolCallStats,
  };
}

/**
 * Run the configured providers in parallel.
 * Each one runs the full ToolLoopAgent flow (think_aloud → calculate_confidence → generate_feedback).
 * Returns aggregated median scores + USC-merged feedback plus the raw per-provider attempts.
 */
export async function runParallelAgents(
  params: Omit<AgentGradingParams, 'provider'>,
  providers: JudgeProvider[] = DEFAULT_PROVIDERS
): Promise<ParallelAgentResult> {
  logger.info({ providers, resultId: params.resultId }, '[ParallelAgents] Starting');

  const promises = providers.map<Promise<ParallelAgentAttempt>>(async (provider) => {
    const t0 = Date.now();
    try {
      const agentResult = await executeGradingAgent({ ...params, provider });
      return {
        provider,
        modelName: JUDGE_MODEL_NAMES[provider],
        success: agentResult.success,
        agentResult,
        error: agentResult.error,
        durationMs: Date.now() - t0,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown agent error';
      logger.warn({ provider, err: message }, '[ParallelAgents] Provider threw');
      return {
        provider,
        modelName: JUDGE_MODEL_NAMES[provider],
        success: false,
        error: message,
        durationMs: Date.now() - t0,
      };
    }
  });

  const attempts = await Promise.all(promises);
  const successful = attempts.filter((a) => a.success && a.agentResult?.data?.breakdown?.length);

  logger.info(
    {
      total: attempts.length,
      successful: successful.length,
      providers: successful.map((a) => a.provider),
    },
    '[ParallelAgents] All providers settled'
  );

  if (successful.length === 0) {
    await persistAttempts(params.resultId, attempts, null);
    return { attempts, aggregated: null };
  }

  const { breakdown, totalScore, maxScore, perCriterionMaxMinusMin } = aggregateBreakdownByMedian(
    successful,
    params.criteria
  );
  const anyCriterionDiverged = Object.values(perCriterionMaxMinusMin).some((d) => d >= DIVERGENCE_THRESHOLD);

  const language: 'zh' | 'en' = (params.userLanguage || 'zh').startsWith('zh') ? 'zh' : 'en';
  const overallFeedback = await mergeFeedbackUSC(successful, language);
  const sparringQuestions = pickSparringQuestions(successful);

  const consensus: ConsensusMetrics = {
    perCriterionMaxMinusMin,
    anyCriterionDiverged,
    medianTotal: totalScore,
  };

  await persistAttempts(params.resultId, attempts, consensus);

  // spec 020: tell the bridge "all 3 providers settled, you can close the stream now".
  if (params.sessionId) {
    try {
      await redis.publish(
        `session:${params.sessionId}`,
        JSON.stringify({
          type: 'aggregate-finish',
          medianTotal: totalScore,
          anyCriterionDiverged,
        })
      );
    } catch (error) {
      logger.warn({ err: error }, '[ParallelAgents] Failed to publish aggregate-finish');
    }
  }

  return {
    attempts,
    aggregated: {
      breakdown,
      totalScore,
      maxScore,
      overallFeedback,
      sparringQuestions,
      consensus,
      successfulProviders: successful.map((a) => a.provider),
    },
  };
}
