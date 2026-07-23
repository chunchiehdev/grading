export const AI_FEEDBACK_MODES = ['COMMENT_ONLY', 'THINKING_VISIBLE', 'THINKING_CHALLENGE'] as const;

export type AiFeedbackMode = (typeof AI_FEEDBACK_MODES)[number];

export const DEFAULT_AI_FEEDBACK_MODE: AiFeedbackMode = 'THINKING_CHALLENGE';

export interface FeedbackModeCapabilities {
  showThinking: boolean;
  requiresChallenge: boolean;
}

export interface FeedbackAcceptanceItem {
  criteriaId: string;
  name: string;
  accepted: boolean;
}

export interface FeedbackAcceptancePayload {
  mode: 'THINKING_VISIBLE';
  acceptedCriteria: FeedbackAcceptanceItem[];
  note: string | null;
  submittedAt: string;
}

export function isAiFeedbackMode(value: unknown): value is AiFeedbackMode {
  return typeof value === 'string' && AI_FEEDBACK_MODES.includes(value as AiFeedbackMode);
}

export function parseAiFeedbackMode(
  value: unknown,
  fallback: AiFeedbackMode = DEFAULT_AI_FEEDBACK_MODE
): AiFeedbackMode {
  return isAiFeedbackMode(value) ? value : fallback;
}

export function getFeedbackModeCapabilities(mode: AiFeedbackMode): FeedbackModeCapabilities {
  return {
    showThinking: mode !== 'COMMENT_ONLY',
    requiresChallenge: mode === 'THINKING_CHALLENGE',
  };
}

export function getFeedbackModeLabel(mode: AiFeedbackMode, language: string = 'zh'): string {
  const isZh = language.startsWith('zh');

  switch (mode) {
    case 'COMMENT_ONLY':
      return isZh ? '模式一：純評語' : 'Mode 1: Comment only';
    case 'THINKING_VISIBLE':
      return isZh ? '模式二：思考歷程' : 'Mode 2: Thinking visible';
    case 'THINKING_CHALLENGE':
      return isZh ? '模式三：思考歷程 + 認知挑戰' : 'Mode 3: Thinking + challenge';
  }
}

export function getFeedbackModeDescription(mode: AiFeedbackMode, language: string = 'zh'): string {
  const isZh = language.startsWith('zh');

  switch (mode) {
    case 'COMMENT_ONLY':
      return isZh
        ? '學生只看到 AI 評語與各項建議，不顯示思考歷程，也不進入挑戰式對話。'
        : 'Students see comments and suggestions only, without AI thinking or challenge chat.';
    case 'THINKING_VISIBLE':
      return isZh
        ? '學生看到 AI 評語與思考歷程，並標記哪些建議可以接受。'
        : 'Students see comments plus AI thinking, then mark which suggestions are acceptable.';
    case 'THINKING_CHALLENGE':
      return isZh
        ? '學生看到 AI 評語與思考歷程，並完成挑戰式對話與採納/保留決策。'
        : 'Students see comments plus AI thinking, then complete challenge chat and an adopt/keep decision.';
  }
}
