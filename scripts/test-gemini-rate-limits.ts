/**
 * Gemini API Rate Limit Stress Test
 *
 * This script tests rate limiting behavior for Gemini API keys:
 * - Tests RPM (Requests Per Minute) limits
 * - Tests TPM (Tokens Per Minute) limits
 * - Tests concurrent request handling
 * - Analyzes error types (rate_limit, overloaded, unavailable)
 * - Measures AI SDK retry behavior and error handling
 *
 * Expected limits for Free Tier (gemini-2.5-flash):
 * - RPM: 10 requests/minute
 * - TPM: 250,000 tokens/minute
 * - RPD: 250 requests/day
 *
 * Usage:
 * npm run test:rate-limits
 */

import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// Test schema
const TestSchema = z.object({
  analysis: z.string(),
  score: z.number(),
});

interface TestResult {
  keyId: string;
  requestNumber: number;
  success: boolean;
  duration: number;
  error?: string;
  errorType?: 'rate_limit' | 'overloaded' | 'unavailable' | 'other';
  retries?: number;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

interface KeyStats {
  keyId: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
  errors: Record<string, number>;
  totalTokens: number;
}

class RateLimitTester {
  private results: TestResult[] = [];
  private keys: { id: string; apiKey: string }[] = [];

  constructor() {
    // Load API keys
    const key1 = process.env.GEMINI_API_KEY;
    const key2 = process.env.GEMINI_API_KEY2;
    const key3 = process.env.GEMINI_API_KEY3;

    if (key1) this.keys.push({ id: '1', apiKey: key1 });
    if (key2) this.keys.push({ id: '2', apiKey: key2 });
    if (key3) this.keys.push({ id: '3', apiKey: key3 });

    console.log(`  Loaded ${this.keys.length} API keys\n`);
  }

  /**
   * Classify error type for analysis
   */
  private classifyError(error: unknown): 'rate_limit' | 'overloaded' | 'unavailable' | 'other' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
        return 'rate_limit';
      }

      if (message.includes('503') || message.includes('overload') || message.includes('busy')) {
        return 'overloaded';
      }

      if (
        message.includes('unavailable') ||
        message.includes('timeout') ||
        message.includes('econnrefused')
      ) {
        return 'unavailable';
      }
    }

    return 'other';
  }

  /**
   * Make a single test request
   */
  private async testRequest(
    keyId: string,
    apiKey: string,
    requestNumber: number,
    prompt: string
  ): Promise<TestResult> {
    const geminiProvider = createGoogleGenerativeAI({ apiKey });
    const startTime = Date.now();

    try {
      const result = await generateObject({
        model: geminiProvider('gemini-2.5-flash'),
        schema: TestSchema,
        prompt,
        temperature: 0.3,
        maxRetries: 3, // Disable built-in retry to see raw errors
      });

      const duration = Date.now() - startTime;

      return {
        keyId,
        requestNumber,
        success: true,
        duration,
        tokens: {
          input: result.usage.inputTokens ?? 0,
          output: result.usage.outputTokens ?? 0,
          total: result.usage.totalTokens ?? 0,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorType = this.classifyError(error);

      return {
        keyId,
        requestNumber,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        errorType,
      };
    }
  }

  /**
   * Test 1: RPM Limit Test
   * Send rapid requests to trigger RPM limit
   */
  async testRPMLimit(requestCount: number = 15): Promise<void> {
    console.log(`\n📊 Test 1: RPM Limit Test (${requestCount} requests)`);
    console.log('='.repeat(60));
    console.log('Expected: ~10 requests should succeed (Free Tier RPM limit)');
    console.log('Rapid fire requests to test RPM limits...\n');

    const prompt = 'Analyze this text: "Hello world". Provide a score from 1-10.';

    // Test each key separately
    for (const key of this.keys) {
      console.log(`\n🔑 Testing Key ${key.id}:`);

      const keyResults: TestResult[] = [];
      const startTime = Date.now();

      // Send all requests rapidly (no delay)
      const promises = Array.from({ length: requestCount }, (_, i) =>
        this.testRequest(key.id, key.apiKey, i + 1, prompt)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          keyResults.push(result.value);
          this.results.push(result.value);
        }
      });

      const totalTime = Date.now() - startTime;
      const successCount = keyResults.filter((r) => r.success).length;
      const failCount = keyResults.filter((r) => !r.success).length;
      const rateLimitErrors = keyResults.filter((r) => r.errorType === 'rate_limit').length;

      console.log(`  ✓ Success: ${successCount}/${requestCount}`);
      console.log(`  ✗ Failed: ${failCount}/${requestCount}`);
      console.log(`  ⏱️  Total time: ${totalTime}ms`);
      console.log(`  🚫 Rate limit errors: ${rateLimitErrors}`);

      if (rateLimitErrors > 0) {
        console.log(`  ⚠️  Rate limit hit after ~${successCount} requests`);
      }
    }
  }

  /**
   * Test 2: Concurrent Request Test
   * Test parallel requests with controlled concurrency
   */
  async testConcurrentRequests(concurrency: number = 5, totalRequests: number = 20): Promise<void> {
    console.log(`\n📊 Test 2: Concurrent Request Test`);
    console.log('='.repeat(60));
    console.log(`Concurrency: ${concurrency} parallel requests`);
    console.log(`Total requests: ${totalRequests}\n`);

    const prompt = 'Analyze this text briefly: "Test message". Score 1-10.';

    for (const key of this.keys) {
      console.log(`\n🔑 Testing Key ${key.id}:`);

      const startTime = Date.now();
      let completed = 0;
      let successCount = 0;
      let failCount = 0;

      // Process requests in batches of 'concurrency'
      for (let i = 0; i < totalRequests; i += concurrency) {
        const batch = Math.min(concurrency, totalRequests - i);
        const promises = Array.from({ length: batch }, (_, j) =>
          this.testRequest(key.id, key.apiKey, i + j + 1, prompt)
        );

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            this.results.push(result.value);
            if (result.value.success) successCount++;
            else failCount++;
            completed++;
          }
        });

        console.log(`  Progress: ${completed}/${totalRequests} requests completed`);

        // Small delay between batches to avoid overwhelming
        if (i + concurrency < totalRequests) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`\n  ✓ Success: ${successCount}/${totalRequests}`);
      console.log(`  ✗ Failed: ${failCount}/${totalRequests}`);
      console.log(`  ⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log(`  📈 Throughput: ${(successCount / (totalTime / 60000)).toFixed(2)} requests/min`);
    }
  }

  /**
   * Test 3: Token Limit Test
   * Test TPM (Tokens Per Minute) limit with large prompts
   */
  async testTokenLimit(largeRequestCount: number = 5): Promise<void> {
    console.log(`\n📊 Test 3: Token Limit Test`);
    console.log('='.repeat(60));
    console.log('Testing TPM (Tokens Per Minute) limits with large prompts');
    console.log('Expected TPM limit (Free Tier): 250,000 tokens/minute\n');

    // Generate a large prompt (~1000 tokens each)
    const largePrompt = `
Analyze the following comprehensive essay and provide detailed feedback.

Essay Content:
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)}

Please provide:
1. A detailed analysis of the writing style and structure
2. Identification of strengths and weaknesses
3. Specific suggestions for improvement
4. An overall quality score from 1-10
5. Summary of key themes and arguments

Be thorough in your analysis and provide specific examples.
    `.trim();

    for (const key of this.keys) {
      console.log(`\n🔑 Testing Key ${key.id}:`);

      const keyResults: TestResult[] = [];
      const startTime = Date.now();

      for (let i = 0; i < largeRequestCount; i++) {
        console.log(`  Request ${i + 1}/${largeRequestCount}...`);
        const result = await this.testRequest(key.id, key.apiKey, i + 1, largePrompt);
        keyResults.push(result);
        this.results.push(result);

        if (result.success && result.tokens) {
          console.log(`    ✓ Tokens: ${result.tokens.total} (in: ${result.tokens.input}, out: ${result.tokens.output})`);
        } else if (result.error) {
          console.log(`    ✗ Error: ${result.errorType}`);
        }

        // Small delay to avoid rapid fire
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const totalTime = Date.now() - startTime;
      const successCount = keyResults.filter((r) => r.success).length;
      const totalTokens = keyResults.reduce((sum, r) => sum + (r.tokens?.total ?? 0), 0);

      console.log(`\n  ✓ Success: ${successCount}/${largeRequestCount}`);
      console.log(`  📊 Total tokens used: ${totalTokens.toLocaleString()}`);
      console.log(`  ⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log(`  📈 Token throughput: ${Math.round(totalTokens / (totalTime / 60000)).toLocaleString()} tokens/min`);
    }
  }

  /**
   * Test 4: Error Recovery Test
   * Test AI SDK retry mechanism with maxRetries enabled
   */
  async testErrorRecovery(): Promise<void> {
    console.log(`\n📊 Test 4: AI SDK Error Recovery Test`);
    console.log('='.repeat(60));
    console.log('Testing AI SDK built-in retry mechanism\n');

    const prompt = 'Quick analysis of "test". Score 1-10.';
    const key = this.keys[0]; // Use first key

    console.log(`🔑 Testing Key ${key.id} with maxRetries=2:\n`);

    // First, trigger rate limit by rapid requests
    console.log('Step 1: Triggering rate limit with 15 rapid requests...');
    const rapidPromises = Array.from({ length: 15 }, (_, i) =>
      this.testRequest(key.id, key.apiKey, i + 1, prompt)
    );
    await Promise.allSettled(rapidPromises);

    console.log('Step 2: Testing retry behavior immediately after rate limit...\n');

    // Now test with retry enabled
    const geminiProvider = createGoogleGenerativeAI({ apiKey: key.apiKey });
    const startTime = Date.now();

    try {
      const result = await generateObject({
        model: geminiProvider('gemini-2.5-flash'),
        schema: TestSchema,
        prompt,
        temperature: 0.3,
        maxRetries: 2, // Enable AI SDK retry
      });

      const duration = Date.now() - startTime;
      console.log(`  ✓ Request succeeded with retries`);
      console.log(`  ⏱️  Duration: ${duration}ms`);
      console.log(`  📊 Tokens: ${result.usage.totalTokens}`);
      console.log(`  💡 AI SDK successfully handled rate limit with retries`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorType = this.classifyError(error);
      console.log(`  ✗ Request failed even with retries`);
      console.log(`  ⏱️  Duration: ${duration}ms`);
      console.log(`  🚫 Error type: ${errorType}`);
      console.log(`  💡 Retries exhausted, rate limit still active`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): void {
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));

    // Overall stats
    const totalRequests = this.results.length;
    const totalSuccess = this.results.filter((r) => r.success).length;
    const totalFailed = this.results.filter((r) => !r.success).length;
    const successRate = ((totalSuccess / totalRequests) * 100).toFixed(2);

    console.log('\n📊 Overall Statistics:');
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(`  ✓ Successful: ${totalSuccess} (${successRate}%)`);
    console.log(`  ✗ Failed: ${totalFailed} (${(100 - parseFloat(successRate)).toFixed(2)}%)`);

    // Per-key statistics
    console.log('\n🔑 Per-Key Statistics:');
    const keyStats: Record<string, KeyStats> = {};

    this.keys.forEach((key) => {
      const keyResults = this.results.filter((r) => r.keyId === key.id);
      const success = keyResults.filter((r) => r.success).length;
      const failed = keyResults.filter((r) => !r.success).length;
      const avgDuration = keyResults.reduce((sum, r) => sum + r.duration, 0) / keyResults.length;
      const totalTokens = keyResults.reduce((sum, r) => sum + (r.tokens?.total ?? 0), 0);

      const errors: Record<string, number> = {};
      keyResults.forEach((r) => {
        if (r.errorType) {
          errors[r.errorType] = (errors[r.errorType] || 0) + 1;
        }
      });

      keyStats[key.id] = {
        keyId: key.id,
        total: keyResults.length,
        success,
        failed,
        avgDuration,
        errors,
        totalTokens,
      };
    });

    Object.values(keyStats).forEach((stats) => {
      console.log(`\n  Key ${stats.keyId}:`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    Success: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`);
      console.log(`    Failed: ${stats.failed}`);
      console.log(`    Avg Duration: ${stats.avgDuration.toFixed(0)}ms`);
      console.log(`    Total Tokens: ${stats.totalTokens.toLocaleString()}`);

      if (Object.keys(stats.errors).length > 0) {
        console.log(`    Error Breakdown:`);
        Object.entries(stats.errors).forEach(([type, count]) => {
          console.log(`      ${type}: ${count}`);
        });
      }
    });

    // Error analysis
    console.log('\n🚫 Error Analysis:');
    const errorTypes = this.results.filter((r) => !r.success);
    const errorBreakdown: Record<string, number> = {};

    errorTypes.forEach((r) => {
      if (r.errorType) {
        errorBreakdown[r.errorType] = (errorBreakdown[r.errorType] || 0) + 1;
      }
    });

    if (Object.keys(errorBreakdown).length === 0) {
      console.log('  No errors encountered! 🎉');
    } else {
      Object.entries(errorBreakdown).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} (${((count / totalFailed) * 100).toFixed(2)}% of failures)`);
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    const rateLimitErrors = errorBreakdown['rate_limit'] || 0;
    const overloadedErrors = errorBreakdown['overloaded'] || 0;

    if (rateLimitErrors > 0) {
      console.log('  ⚠️  Rate limit errors detected:');
      console.log('     - Consider implementing request queuing');
      console.log('     - Use KeyHealthTracker for distributed key rotation');
      console.log('     - Add exponential backoff between retries');
      console.log('     - Monitor RPM/TPM usage closely');
    }

    if (overloadedErrors > 0) {
      console.log('  ⚠️  Service overload errors detected:');
      console.log('     - Implement circuit breaker pattern');
      console.log('     - Add fallback to alternative providers (OpenAI)');
      console.log('     - Consider upgrading to paid tier for higher limits');
    }

    if (totalSuccess === totalRequests) {
      console.log('    All requests successful!');
      console.log('     - Current load is within rate limits');
      console.log('     - Consider gradual load increase for capacity testing');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<void> {
    console.log('🚀 Starting Gemini API Rate Limit Stress Test');
    console.log('='.repeat(60));
    console.log(`Testing with ${this.keys.length} API key(s)`);
    console.log('Model: gemini-2.5-flash');
    console.log('Expected limits (Free Tier): RPM=10, TPM=250K, RPD=250\n');

    try {
      // await this.testRPMLimit(15);
      // await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool down

      // await this.testConcurrentRequests(3, 12);
      // await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool down

      // await this.testTokenLimit(5);
      // await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool down

      await this.testErrorRecovery();

      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }
}

// Run tests
const tester = new RateLimitTester();
tester.runAll().catch(console.error);
