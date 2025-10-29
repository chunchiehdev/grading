/**
 * Real API Load Testing Configuration
 *
 * Manages Gemini 2.0 Flash free tier limits and cost controls
 */

export interface RealApiTestConfig {
  enabled: boolean;
  gemini: {
    rpmLimit: number; // 15 requests per minute
    tpmLimit: number; // 1,000,000 tokens per minute
    rpdLimit: number; // 200 requests per day
    model: string; // gemini-2.0-flash-exp
  };
  loadTesting: {
    maxConcurrentUsers: number;
    testDurationMs: number;
    throttleDelayMs: number;
    maxCostPerTest: number;
  };
  pdf: {
    maxFileSizeKB: number;
    testContentLength: number;
    concurrentProcessingLimit: number;
  };
}

export const REAL_API_CONFIG: RealApiTestConfig = {
  enabled: process.env.TEST_REAL_APIS === 'true',

  gemini: {
    rpmLimit: 15, // Gemini 2.0 Flash free tier
    tpmLimit: 1_000_000, // 1M tokens per minute
    rpdLimit: 200, // 200 requests per day
    model: 'gemini-2.0-flash',
  },

  loadTesting: {
    maxConcurrentUsers: 25, // Test beyond 15 RPM limit
    testDurationMs: 120_000, // 2 minute load test
    throttleDelayMs: 1000, // 1 second between individual requests
    maxCostPerTest: 5.0, // $5 budget limit per test run
  },

  pdf: {
    maxFileSizeKB: 50, // Small PDFs to control costs
    testContentLength: 200, // ~200 characters of content
    concurrentProcessingLimit: 10,
  },
};

export class RateLimitTracker {
  private requestCounts: Map<number, number> = new Map();
  private tokenCounts: Map<number, number> = new Map();
  private dailyRequests = 0;
  private startTime = Date.now();

  getCurrentMinute(): number {
    return Math.floor((Date.now() - this.startTime) / 60000);
  }

  recordRequest(tokens: number = 100): void {
    const minute = this.getCurrentMinute();

    // Track requests per minute
    this.requestCounts.set(minute, (this.requestCounts.get(minute) || 0) + 1);

    // Track tokens per minute
    this.tokenCounts.set(minute, (this.tokenCounts.get(minute) || 0) + tokens);

    // Track daily requests
    this.dailyRequests++;
  }

  getRequestsInCurrentMinute(): number {
    const minute = this.getCurrentMinute();
    return this.requestCounts.get(minute) || 0;
  }

  getTokensInCurrentMinute(): number {
    const minute = this.getCurrentMinute();
    return this.tokenCounts.get(minute) || 0;
  }

  getDailyRequests(): number {
    return this.dailyRequests;
  }

  isRateLimited(): boolean {
    return (
      this.getRequestsInCurrentMinute() >= REAL_API_CONFIG.gemini.rpmLimit ||
      this.getTokensInCurrentMinute() >= REAL_API_CONFIG.gemini.tpmLimit ||
      this.getDailyRequests() >= REAL_API_CONFIG.gemini.rpdLimit
    );
  }

  getStatus() {
    return {
      requestsThisMinute: this.getRequestsInCurrentMinute(),
      tokensThisMinute: this.getTokensInCurrentMinute(),
      dailyRequests: this.getDailyRequests(),
      isRateLimited: this.isRateLimited(),
      limits: {
        rpm: REAL_API_CONFIG.gemini.rpmLimit,
        tpm: REAL_API_CONFIG.gemini.tpmLimit,
        rpd: REAL_API_CONFIG.gemini.rpdLimit,
      },
    };
  }
}

export class CostTracker {
  private totalCost = 0;
  private requestCount = 0;

  // Gemini 2.0 Flash pricing (estimated)
  private readonly COST_PER_1K_INPUT_TOKENS = 0.000075; // $0.075 per 1M tokens
  private readonly COST_PER_1K_OUTPUT_TOKENS = 0.0003; // $0.30 per 1M tokens

  recordRequest(inputTokens: number, outputTokens: number): void {
    const inputCost = (inputTokens / 1000) * this.COST_PER_1K_INPUT_TOKENS;
    const outputCost = (outputTokens / 1000) * this.COST_PER_1K_OUTPUT_TOKENS;

    this.totalCost += inputCost + outputCost;
    this.requestCount++;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  isOverBudget(): boolean {
    return this.totalCost > REAL_API_CONFIG.loadTesting.maxCostPerTest;
  }

  getStatus() {
    return {
      totalCost: this.totalCost,
      requestCount: this.requestCount,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      isOverBudget: this.isOverBudget(),
      budget: REAL_API_CONFIG.loadTesting.maxCostPerTest,
    };
  }
}

export function createMinimalTestContent(): string {
  return `
Test Essay: Climate Change Analysis

Climate change is one of the most pressing issues of our time. The scientific consensus shows that human activities are the primary driver of recent climate change.

Key points:
1. Rising global temperatures
2. Increased extreme weather events  
3. Impact on ecosystems and biodiversity
4. Need for immediate action

Conclusion: We must act now to address climate change through policy, technology, and individual actions.
  `.trim();
}

export function createTestRubric() {
  // Use dynamic import to get uuid
  const { v4: uuidv4 } = require('uuid');

  return {
    name: 'Load Test Rubric',
    criteria: [
      {
        id: uuidv4(),
        name: 'Content Quality',
        description: 'Quality of content and arguments',
        maxScore: 50,
        levels: [
          { score: 50, description: 'Excellent content' },
          { score: 30, description: 'Good content' },
          { score: 10, description: 'Poor content' },
        ],
      },
      {
        id: uuidv4(),
        name: 'Structure',
        description: 'Organization and flow',
        maxScore: 50,
        levels: [
          { score: 50, description: 'Well organized' },
          { score: 30, description: 'Adequately organized' },
          { score: 10, description: 'Poorly organized' },
        ],
      },
    ],
  };
}

export async function waitForRateLimit(rateLimitTracker: RateLimitTracker): Promise<void> {
  while (rateLimitTracker.isRateLimited()) {
    console.log(
      `⏳ Rate limited. Waiting... ${rateLimitTracker.getStatus().requestsThisMinute}/15 requests this minute`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
  }
}

export function shouldSkipRealApiTests(): string | null {
  if (!REAL_API_CONFIG.enabled) {
    return 'Real API tests disabled. Set TEST_REAL_APIS=true to enable.';
  }

  if (!process.env.GEMINI_API_KEY) {
    return 'GEMINI_API_KEY not found in environment variables.';
  }

  if (!process.env.OPENAI_API_KEY) {
    return 'OPENAI_API_KEY not found in environment variables.';
  }

  return null;
}
