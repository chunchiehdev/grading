import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  mergeDraftMessagesPreservingContent,
  toDraftChatMessage,
  toFeedbackUIMessage,
} from '../../app/components/grading/FeedbackChat';

describe('feedback chat message persistence', () => {
  it('extracts text from ui message parts into draft message content', () => {
    const message: UIMessage<{
      studentDecision?: 'adopt' | 'keep';
      studentDecisionReason?: string;
      studentReaction?: 'up' | 'down';
    }> = {
      id: 'assistant-1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello from parts' }],
      metadata: {
        studentReaction: 'up',
      },
    };

    expect(toDraftChatMessage(message)).toMatchObject({
      id: 'assistant-1',
      role: 'assistant',
      content: 'hello from parts',
      studentReaction: 'up',
    });
  });

  it('restores draft message content and metadata into ui message', () => {
    const restored = toFeedbackUIMessage(
      {
        id: 'user-1',
        role: 'user',
        content: 'saved text',
        studentDecision: 'adopt',
        studentDecisionReason: 'because this is stronger',
        decisionAt: '2026-04-24T22:00:00.000Z',
        convergenceSuggestionAt: '2026-04-24T21:59:00.000Z',
        decisionLatencyMs: 60000,
        roundsBeforeDecision: 3,
        studentReaction: 'down',
      },
      0
    );

    expect(restored.parts).toEqual([{ type: 'text', text: 'saved text' }]);
    expect(restored.metadata).toMatchObject({
      studentDecision: 'adopt',
      studentDecisionReason: 'because this is stronger',
      decisionAt: '2026-04-24T22:00:00.000Z',
      convergenceSuggestionAt: '2026-04-24T21:59:00.000Z',
      decisionLatencyMs: 60000,
      roundsBeforeDecision: 3,
      studentReaction: 'down',
    });
  });

  it('supports legacy draft messages that only have parts text', () => {
    const restored = toFeedbackUIMessage(
      {
        id: 'legacy-1',
        role: 'assistant',
        content: '',
        parts: [{ type: 'text', text: 'legacy text' }],
      },
      0
    );

    expect(restored.parts).toEqual([{ type: 'text', text: 'legacy text' }]);
  });

  it('does not overwrite previous non-empty content with empty content', () => {
    const merged = mergeDraftMessagesPreservingContent(
      [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: '',
        },
      ],
      [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'existing text',
        },
      ]
    );

    expect(merged[0]?.content).toBe('existing text');
  });
});
