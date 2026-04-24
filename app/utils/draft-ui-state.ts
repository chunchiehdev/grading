import type { SparringState } from '@/components/grading/FeedbackChat';

export type DraftPhase = 'idle' | 'uploaded' | 'analyzing' | 'completed' | 'sparring' | 'error';

export interface DraftChatMessage {
  id?: string;
  role?: string;
  content?: string;
  studentDecision?: 'adopt' | 'keep';
  studentDecisionReason?: string;
  decisionAt?: string;
  convergenceSuggestionAt?: string;
  decisionLatencyMs?: number;
  roundsBeforeDecision?: number;
}

export interface DraftUiState {
  sparringState?: SparringState;
  chatMessagesMap?: Record<number, DraftChatMessage[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidSparringPhase(value: unknown): value is SparringState['phase'] {
  return value === 'chat' || value === 'summary';
}

function toDraftChatMessageArray(value: unknown): DraftChatMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is DraftChatMessage => isRecord(item));
}

function toChatMessagesMap(value: unknown): Record<number, DraftChatMessage[]> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value)
    .map(([key, messages]) => {
      const numericKey = Number(key);
      const parsedMessages = toDraftChatMessageArray(messages);
      if (!Number.isInteger(numericKey) || numericKey < 0 || !parsedMessages) {
        return null;
      }
      return [numericKey, parsedMessages] as const;
    })
    .filter((entry): entry is readonly [number, DraftChatMessage[]] => entry !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function toSparringState(value: unknown): SparringState | undefined {
  if (!isRecord(value)) return undefined;

  const activeQuestionIndex = typeof value.activeQuestionIndex === 'number' ? value.activeQuestionIndex : 0;
  const completedQuestionIndices = Array.isArray(value.completedQuestionIndices)
    ? value.completedQuestionIndices.filter((item): item is number => typeof item === 'number' && item >= 0)
    : [];
  const phase = isValidSparringPhase(value.phase) ? value.phase : 'chat';

  return {
    activeQuestionIndex,
    completedQuestionIndices,
    phase,
  };
}

export function parseDraftUiState(value: unknown): DraftUiState | undefined {
  if (!isRecord(value)) return undefined;

  const sparringState = toSparringState(value.sparringState);
  const chatMessagesMap = toChatMessagesMap(value.chatMessagesMap);

  if (!sparringState && !chatMessagesMap) {
    return undefined;
  }

  return {
    ...(sparringState ? { sparringState } : {}),
    ...(chatMessagesMap ? { chatMessagesMap } : {}),
  };
}

export function parseLegacyDraftUiState(value: unknown): DraftUiState | undefined {
  if (!isRecord(value)) return undefined;

  return parseDraftUiState({
    sparringState: value._sparringState,
    chatMessagesMap: value._chatMessagesMap,
  });
}

export function normalizeDraftPhase(value: unknown): DraftPhase {
  switch (value) {
    case 'uploaded':
    case 'analyzing':
    case 'completed':
    case 'sparring':
    case 'error':
    case 'idle':
      return value;
    case 'ready':
      return 'uploaded';
    case 'grading':
      return 'analyzing';
    default:
      return 'idle';
  }
}
