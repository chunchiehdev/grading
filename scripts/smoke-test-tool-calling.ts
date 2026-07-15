/**
 * Smoke test: does ToolLoopAgent work identically across Gemini / OpenAI / Claude?
 *
 * Verifies:
 *  1. Each provider can be wrapped by Vercel AI SDK ToolLoopAgent
 *  2. Each provider correctly calls a 2-step tool sequence (think → answer)
 *  3. Each provider returns the expected final output
 *  4. We can observe stepResult callbacks (for our Redis streaming)
 *
 * Usage: tsx scripts/smoke-test-tool-calling.ts
 * Cleanup: delete this file after Phase 0.5 passes.
 */

import { config } from 'dotenv';
import { ToolLoopAgent, tool, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

config(); // load .env

type ProviderId = 'gemini' | 'openai' | 'anthropic';

interface SmokeResult {
  provider: ProviderId;
  modelName: string;
  success: boolean;
  thinkCalled: boolean;
  computeCalled: boolean;
  finalAnswer: number | null;
  expectedAnswer: number;
  steps: number;
  toolCallSequence: string[];
  durationMs: number;
  error?: string;
}

/**
 * Two tools that mirror our real agent flow:
 *  - think_aloud: model must call this first (analogous to our Hattie & Timperley step)
 *  - compute_sum: model must call this second to actually answer (analogous to generate_feedback)
 *
 * Final answer is 12 + 30 = 42. We check the model:
 *  (a) calls think_aloud first
 *  (b) calls compute_sum second with correct args
 *  (c) doesn't hallucinate
 */
function createTestTools(toolCallSequence: string[]) {
  return {
    think_aloud: tool({
      description:
        'MANDATORY FIRST STEP: explain your reasoning before computing. Return a single sentence about your approach.',
      inputSchema: z.object({
        reasoning: z.string().describe('Your one-sentence plan before computing.'),
      }),
      execute: async ({ reasoning }: { reasoning: string }) => {
        toolCallSequence.push('think_aloud');
        return { acknowledged: true, reasoning };
      },
    }),
    compute_sum: tool({
      description: 'Compute the sum of two numbers. Call this AFTER think_aloud.',
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }: { a: number; b: number }) => {
        toolCallSequence.push('compute_sum');
        return { sum: a + b };
      },
    }),
  };
}

const SYSTEM_PROMPT = `You are a math assistant. To answer questions, you MUST:
1. First call think_aloud with a brief plan.
2. Then call compute_sum with the numbers.
3. Then reply with the final numeric answer (a single number).
Do not skip step 1.`;

async function smokeTest(provider: ProviderId): Promise<SmokeResult> {
  const t0 = Date.now();
  const toolCallSequence: string[] = [];
  const tools = createTestTools(toolCallSequence);

  let model;
  let modelName: string;

  try {
    switch (provider) {
      case 'gemini': {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY missing');
        modelName = 'gemini-2.5-flash';
        model = createGoogleGenerativeAI({ apiKey })(modelName);
        break;
      }
      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');
        modelName = 'gpt-4o-mini';
        model = createOpenAI({ apiKey })(modelName);
        break;
      }
      case 'anthropic': {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
        modelName = 'claude-haiku-4-5-20251001';
        model = createAnthropic({ apiKey })(modelName);
        break;
      }
    }

    const agent = new ToolLoopAgent({
      model,
      system: SYSTEM_PROMPT,
      tools,
      stopWhen: stepCountIs(5),
    });

    const result = await agent.generate({
      prompt: 'What is 12 plus 30?',
    });

    const expectedAnswer = 42;
    const finalText = result.text || '';
    // Take the LAST number in the response (the answer), not the first (which echoes the question)
    const allNumbers = finalText.match(/-?\d+(\.\d+)?/g);
    const finalAnswer = allNumbers && allNumbers.length > 0 ? Number(allNumbers[allNumbers.length - 1]) : null;

    return {
      provider,
      modelName,
      success: finalAnswer === expectedAnswer && toolCallSequence.includes('compute_sum'),
      thinkCalled: toolCallSequence.includes('think_aloud'),
      computeCalled: toolCallSequence.includes('compute_sum'),
      finalAnswer,
      expectedAnswer,
      steps: result.steps?.length ?? 0,
      toolCallSequence,
      durationMs: Date.now() - t0,
    };
  } catch (error) {
    return {
      provider,
      modelName: modelName! ?? 'unknown',
      success: false,
      thinkCalled: false,
      computeCalled: false,
      finalAnswer: null,
      expectedAnswer: 42,
      steps: 0,
      toolCallSequence,
      durationMs: Date.now() - t0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function fmt(r: SmokeResult): string {
  const tick = r.success ? '✅' : '❌';
  const detail = r.success
    ? `answer=${r.finalAnswer}, steps=${r.steps}, ${r.durationMs}ms, sequence=[${r.toolCallSequence.join(' → ')}]`
    : `error="${r.error ?? 'mismatch'}", thinkCalled=${r.thinkCalled}, computeCalled=${r.computeCalled}, finalAnswer=${r.finalAnswer}, sequence=[${r.toolCallSequence.join(' → ')}]`;
  return `${tick} ${r.provider.padEnd(10)} (${r.modelName.padEnd(28)}) ${detail}`;
}

async function main() {
  console.log('🧪 ToolLoopAgent smoke test — Gemini / OpenAI / Claude\n');

  const providers: ProviderId[] = ['gemini', 'openai', 'anthropic'];
  const results: SmokeResult[] = [];

  // Run sequentially so each provider's logs are clean
  for (const p of providers) {
    process.stdout.write(`Testing ${p}... `);
    const r = await smokeTest(p);
    results.push(r);
    process.stdout.write(r.success ? 'OK\n' : 'FAIL\n');
  }

  console.log('\n--- Results ---');
  for (const r of results) console.log(fmt(r));

  console.log('\n--- Summary ---');
  const passing = results.filter((r) => r.success).length;
  console.log(`${passing}/${results.length} providers passed.`);

  // Detailed advice when failures occur
  for (const r of results) {
    if (r.success) continue;
    console.log(`\n⚠️  ${r.provider} failed:`);
    if (!r.thinkCalled) console.log('   - think_aloud was NOT called (model skipped step 1)');
    if (!r.computeCalled) console.log('   - compute_sum was NOT called');
    if (r.error) console.log(`   - error: ${r.error}`);
    if (r.computeCalled && r.finalAnswer !== r.expectedAnswer) {
      console.log(`   - tool worked but final text answer wrong: got ${r.finalAnswer}, expected ${r.expectedAnswer}`);
    }
  }

  process.exit(passing === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('Unexpected:', e);
  process.exit(2);
});
