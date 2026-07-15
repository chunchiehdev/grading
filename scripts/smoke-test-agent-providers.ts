/**
 * Phase 1 smoke test: run executeGradingAgent against each provider with a real-ish
 * rubric and submission to confirm think_aloud → calculate_confidence → generate_feedback
 * completes for OpenAI and Claude (not just Gemini).
 *
 * Does NOT touch the database. Skips streaming. Pure provider plumbing check.
 *
 * Usage: tsx scripts/smoke-test-agent-providers.ts
 */

import { config } from 'dotenv';
config();

import { executeGradingAgent } from '../app/services/agent-executor.server';
import type { JudgeProvider } from '../app/types/agent';

const SAMPLE_CONTENT = `
This semester I learned about UX research methods. At first I thought
user interviews were just casual chats, but after running my own I
realized how much preparation matters. I had to write a script,
recruit participants, and analyze the recordings. The biggest
lesson was that my assumptions about what users want were often wrong.
I now believe research before design saves time downstream.
`.trim();

const SAMPLE_CRITERIA = [
  {
    criteriaId: 'c1',
    name: 'Evidence of Reflection',
    description: 'Does the student cite specific experiences and reflect on what they learned?',
    maxScore: 5,
    levels: [
      { score: 1, description: 'Vague, no examples' },
      { score: 3, description: 'Some specific examples but shallow' },
      { score: 5, description: 'Specific examples with deep insight' },
    ],
  },
  {
    criteriaId: 'c2',
    name: 'Perspective Shift',
    description: 'Does the student demonstrate a change in thinking?',
    maxScore: 5,
    levels: [
      { score: 1, description: 'No change' },
      { score: 3, description: 'Mild reconsideration' },
      { score: 5, description: 'Clear before/after shift with reasoning' },
    ],
  },
];

async function testProvider(provider: JudgeProvider) {
  const t0 = Date.now();
  console.log(`\n=== ${provider.toUpperCase()} ===`);

  try {
    const result = await executeGradingAgent({
      submissionId: 'smoke-' + provider,
      uploadedFileId: 'smoke-' + provider,
      fileName: 'reflection.txt',
      content: SAMPLE_CONTENT,
      rubricId: 'smoke-rubric',
      rubricName: 'Reflection Quality',
      criteria: SAMPLE_CRITERIA,
      userId: 'smoke-user',
      resultId: 'smoke-result-' + provider,
      userLanguage: 'en',
      maxSteps: 8,
      provider,
    });

    const ms = Date.now() - t0;
    const breakdown = result.data?.breakdown ?? [];
    const totalScore = breakdown.reduce((s, b) => s + (b.score ?? 0), 0);
    const toolNames = result.steps
      .map((s) => s.toolName)
      .filter(Boolean)
      .join(' → ');

    console.log(`  success:    ${result.success}`);
    console.log(`  steps:      ${result.steps.length}`);
    console.log(`  toolCalls:  [${toolNames}]`);
    console.log(`  totalScore: ${totalScore}/10`);
    console.log(`  confidence: ${result.confidenceScore?.toFixed(2) ?? 'n/a'}`);
    console.log(`  durationMs: ${ms}`);
    if (result.error) console.log(`  error:      ${result.error}`);

    return { provider, success: result.success, ms, totalScore, error: result.error };
  } catch (error) {
    const ms = Date.now() - t0;
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ THREW: ${msg}`);
    return { provider, success: false, ms, totalScore: 0, error: msg };
  }
}

async function main() {
  console.log('🧪 Phase 1 agent-executor provider smoke test\n');

  const providers: JudgeProvider[] = ['gemini', 'openai', 'anthropic'];
  const results = [];
  for (const p of providers) {
    results.push(await testProvider(p));
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    const mark = r.success ? '✅' : '❌';
    console.log(
      `${mark} ${r.provider.padEnd(10)} success=${r.success} score=${r.totalScore}/10 duration=${r.ms}ms ${
        r.error ? `error="${r.error}"` : ''
      }`
    );
  }

  const passed = results.filter((r) => r.success).length;
  console.log(`\n${passed}/${results.length} providers completed the full agent loop.`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('Unexpected:', e);
  process.exit(2);
});
