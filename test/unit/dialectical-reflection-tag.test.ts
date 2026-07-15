import { describe, it, expect } from 'vitest';
import { parseReflectionTag } from '@/services/dialectical-feedback.server';

describe('parseReflectionTag', () => {
  it('extracts level and state and strips the tag from the body', () => {
    const { level, state, body } = parseReflectionTag('<<L3|D>>\n你的觀察很有意思，要不要再想想前提？');
    expect(level).toBe('L3');
    expect(state).toBe('D');
    expect(body).toBe('你的觀察很有意思，要不要再想想前提？');
  });

  it('tolerates spacing and lowercase', () => {
    expect(parseReflectionTag('<< l1 | a >> hello').level).toBe('L1');
    expect(parseReflectionTag('<< l1 | a >> hello').state).toBe('A');
  });

  it('graceful degrade: no tag → level undefined, body is original text', () => {
    const { level, state, body } = parseReflectionTag('I think your point holds up.');
    expect(level).toBeUndefined();
    expect(state).toBeUndefined();
    expect(body).toBe('I think your point holds up.');
  });
});
