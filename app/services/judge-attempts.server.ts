/**
 * Judge attempts loader (spec 020)
 *
 * Reads the per-provider thinking traces stored by `parallel-agents.server.ts`
 * so the historical submission view can show three tabs of think_aloud markdown,
 * not just the legacy single-string `thinkingProcess` column.
 */

import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import type { GradingResultData } from '@/types/grading';

type ProviderKey = 'gemini' | 'openai' | 'anthropic';
const PROVIDERS: ProviderKey[] = ['gemini', 'openai', 'anthropic'];

type StepLike = { toolName?: string; reasoning?: string };

export interface JudgeAttemptsBundle {
  /** True if at least one provider has data (UI shows tabs only when this is true). */
  hasMultiModel: boolean;
  thinkingByProvider: Partial<Record<ProviderKey, string>>;
  scoresByProvider: Partial<Record<ProviderKey, number>>;
  /** Full per-provider GradingResultData (overallFeedback, breakdown, sparringQuestions). */
  resultsByProvider: Partial<Record<ProviderKey, GradingResultData>>;
}

const EMPTY: JudgeAttemptsBundle = {
  hasMultiModel: false,
  thinkingByProvider: {},
  scoresByProvider: {},
  resultsByProvider: {},
};

/**
 * Given a submission's `sessionId`, find its grading result and pull per-provider
 * think_aloud reasoning + total score from `judge_attempts`. Returns EMPTY when no
 * multi-model run exists for this session (legacy single-model submissions).
 */
export async function getJudgeAttemptsForSession(sessionId: string | null | undefined): Promise<JudgeAttemptsBundle> {
  if (!sessionId) return EMPTY;

  try {
    const gradingResult = await db.gradingResult.findFirst({
      where: { gradingSessionId: sessionId, isMultiModelJudged: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!gradingResult) return EMPTY;

    const attempts = await db.judgeAttempt.findMany({
      where: { gradingResultId: gradingResult.id, success: true },
      select: { provider: true, agentSteps: true, result: true },
    });
    if (attempts.length === 0) return EMPTY;

    const thinkingByProvider: Partial<Record<ProviderKey, string>> = {};
    const scoresByProvider: Partial<Record<ProviderKey, number>> = {};
    const resultsByProvider: Partial<Record<ProviderKey, GradingResultData>> = {};

    for (const a of attempts) {
      if (!PROVIDERS.includes(a.provider as ProviderKey)) continue;
      const key = a.provider as ProviderKey;

      // Join all think_aloud reasoning blocks for this provider (usually one).
      const steps = (a.agentSteps as StepLike[] | null) ?? [];
      const thought = steps
        .filter((s) => s?.toolName === 'think_aloud' || s?.toolName === 'think')
        .map((s) => (typeof s.reasoning === 'string' ? s.reasoning : ''))
        .filter((t) => t.length > 0)
        .join('\n\n');
      if (thought.length > 0) thinkingByProvider[key] = thought;

      const result = a.result as GradingResultData | null;
      if (result) {
        resultsByProvider[key] = result;
        if (typeof result.totalScore === 'number') scoresByProvider[key] = result.totalScore;
      }
    }

    return {
      hasMultiModel: Object.keys(thinkingByProvider).length > 0 || Object.keys(resultsByProvider).length > 0,
      thinkingByProvider,
      scoresByProvider,
      resultsByProvider,
    };
  } catch (error) {
    logger.error({ err: error, sessionId }, '[JudgeAttempts] Failed to load for session');
    return EMPTY;
  }
}
