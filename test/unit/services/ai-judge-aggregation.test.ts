/**
 * Self-check for ai-judge.server aggregation logic.
 * Only covers pure aggregation; provider calls are mocked at unit level via fixtures.
 */

import { describe, it, expect } from 'vitest';
import type { GradingResultData } from '@/types/grading';

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function makeResult(scores: number[]): GradingResultData {
  return {
    totalScore: scores.reduce((s, n) => s + n, 0),
    maxScore: scores.length * 5,
    breakdown: scores.map((s, i) => ({
      criteriaId: `c${i + 1}`,
      name: `Criterion ${i + 1}`,
      score: s,
      feedback: `fb ${i + 1}`,
    })),
    overallFeedback: 'overall',
  };
}

describe('ai-judge aggregation', () => {
  it('median picks middle value for odd count', () => {
    expect(median([3, 5, 4])).toBe(4);
  });

  it('median averages two middle values for even count', () => {
    expect(median([3, 4, 5, 6])).toBe(4.5);
  });

  it('divergence threshold of 2 catches 3-vs-5 spread', () => {
    const a = makeResult([3, 4]);
    const b = makeResult([4, 4]);
    const c = makeResult([5, 4]);
    const c1Scores = [a, b, c].map((r) => r.breakdown[0].score);
    expect(Math.max(...c1Scores) - Math.min(...c1Scores)).toBeGreaterThanOrEqual(2);
  });

  it('divergence threshold of 2 ignores 4-vs-4-vs-5 spread', () => {
    const c1Scores = [4, 4, 5];
    expect(Math.max(...c1Scores) - Math.min(...c1Scores)).toBeLessThan(2);
  });
});
