import { describe, expect, it } from 'vitest';
import { normalizeDraftPhase, parseDraftUiState, parseLegacyDraftUiState } from '@/utils/draft-ui-state';

describe('draft ui state helpers', () => {
  it('parses persisted draft ui state', () => {
    const result = parseDraftUiState({
      sparringState: {
        activeQuestionIndex: 1,
        completedQuestionIndices: [0],
        phase: 'chat',
      },
      chatMessagesMap: {
        1: [{ role: 'user', content: 'hello' }],
      },
    });

    expect(result).toEqual({
      sparringState: {
        activeQuestionIndex: 1,
        completedQuestionIndices: [0],
        phase: 'chat',
      },
      chatMessagesMap: {
        1: [{ role: 'user', content: 'hello' }],
      },
    });
  });

  it('parses legacy draft ui state', () => {
    const result = parseLegacyDraftUiState({
      _sparringState: {
        activeQuestionIndex: 0,
        completedQuestionIndices: [],
        phase: 'summary',
      },
      _chatMessagesMap: {
        0: [{ role: 'assistant', content: 'saved' }],
      },
    });

    expect(result?.sparringState?.phase).toBe('summary');
    expect(result?.chatMessagesMap?.[0]?.[0]).toMatchObject({ role: 'assistant', content: 'saved' });
  });

  it('normalizes legacy phase values', () => {
    expect(normalizeDraftPhase('ready')).toBe('uploaded');
    expect(normalizeDraftPhase('grading')).toBe('analyzing');
    expect(normalizeDraftPhase('sparring')).toBe('sparring');
    expect(normalizeDraftPhase('unknown')).toBe('idle');
  });
});
