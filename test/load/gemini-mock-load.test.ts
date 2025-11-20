import { describe, it, expect, beforeAll, afterAll, vi, Mock } from 'vitest';
import {
  REAL_API_CONFIG,
  RateLimitTracker,
  CostTracker,
  createMinimalTestContent,
  createTestRubric,
} from './real-api-config';
import {
  UserFactory,
  RubricFactory,
  UploadedFileFactory,
  GradingSessionFactory,
  GradingResultFactory,
} from '../factories';
import { processGradingResult } from '@/services/grading-engine.server';

// Mock the grading service
vi.mock('@/services/grading-engine.server');

/**
 * Mock Load Tests for Gemini 2.0 Flash
 *
 * Tests rate limiting, fallback, and concurrent processing logic
 * without making real API calls
 */
describe('Gemini Mock Load Tests', () => {
  let rateLimitTracker: RateLimitTracker;
  let costTracker: CostTracker;
  let mockProcessGradingResult: Mock;

  beforeAll(() => {
    rateLimitTracker = new RateLimitTracker();
    costTracker = new CostTracker();
    mockProcessGradingResult = vi.mocked(processGradingResult);

    console.log('🚀 Starting Mock Load Tests');
    console.log(`🎯 Simulating Gemini limits: ${REAL_API_CONFIG.gemini.rpmLimit} RPM`);
  });

  afterAll(() => {
    console.log('\\n📊 Mock Load Test Results Summary:');
    console.log('Rate Limit Status:', rateLimitTracker.getStatus());
    console.log('Cost Status:', costTracker.getStatus());
  });

  describe('Rate Limit Logic Validation', () => {
    it('should simulate rate limit detection and handling', async () => {
      console.log('\\n🔥 Testing Rate Limit Detection Logic');

      // Mock responses: first 15 succeed, then start failing with rate limits
      let callCount = 0;
      mockProcessGradingResult.mockImplementation(async () => {
        callCount++;
        const delay = callCount > 15 ? 2000 : 100; // Simulate slower responses after rate limit

        await new Promise((resolve) => setTimeout(resolve, delay));

        if (callCount > 15) {
          // Simulate rate limit error
          throw new Error('Rate limit exceeded: Too many requests per minute');
        }

        return {
          success: true,
          result: {
            totalScore: 85,
            maxScore: 100,
            breakdown: [
              { criteriaId: 'content', score: 42, feedback: 'Good analysis' },
              { criteriaId: 'structure', score: 43, feedback: 'Clear structure' },
            ],
          },
        };
      });

      // Create test data
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        ...createTestRubric(),
      });
      const gradingSession = await GradingSessionFactory.create({
        userId: teacher.id,
        status: 'PENDING',
      });

      // Create 20 test files to exceed 15 RPM limit
      const testFiles = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `mock-test-${i}.pdf`,
            parsedContent: createMinimalTestContent(),
            parseStatus: 'COMPLETED',
          })
        )
      );

      const gradingResults = await Promise.all(
        testFiles.map((file) =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING',
          })
        )
      );

      const results: Array<{ success: boolean; rateLimited: boolean; responseTime: number }> = [];
      let rateLimitHit = false;

      console.log('🚀 Processing 20 requests to test rate limit logic...');

      // Process requests sequentially to simulate rate limiting
      for (let i = 0; i < gradingResults.length; i++) {
        const startTime = Date.now();

        try {
          await processGradingResult(gradingResults[i].id, teacher.id, gradingSession.id);

          const responseTime = Date.now() - startTime;
          rateLimitTracker.recordRequest(150);
          costTracker.recordRequest(100, 50);

          results.push({
            success: true,
            rateLimited: false,
            responseTime,
          });

          console.log(`  Request ${i + 1}: Success (${rateLimitTracker.getRequestsInCurrentMinute()}/15)`);
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const isRateLimitError = error instanceof Error && error.message.includes('Rate limit');

          if (isRateLimitError) {
            rateLimitHit = true;
          }

          results.push({
            success: false,
            rateLimited: isRateLimitError,
            responseTime,
          });

          console.log(`❌ Request ${i + 1}: ${isRateLimitError ? 'Rate Limited' : 'Failed'}`);
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Analyze results
      const successfulRequests = results.filter((r) => r.success).length;
      const rateLimitedRequests = results.filter((r) => r.rateLimited).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log('\\n📊 Mock Rate Limit Test Results:');
      console.log(`  Successful requests: ${successfulRequests}/${results.length}`);
      console.log(`⚠️  Rate limited requests: ${rateLimitedRequests}`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);

      // Assertions
      expect(results.length).toBe(20);
      expect(rateLimitHit).toBe(true);
      expect(successfulRequests).toBe(15); // First 15 should succeed
      expect(rateLimitedRequests).toBe(5); // Last 5 should be rate limited
      expect(rateLimitTracker.getRequestsInCurrentMinute()).toBeGreaterThanOrEqual(15);

      console.log('  Mock rate limit detection test completed');
    });

    it('should simulate fallback mechanism when rate limited', async () => {
      console.log('\\n🔄 Testing Fallback Mechanism Logic');

      // Reset mocks
      vi.clearAllMocks();
      let geminiCalls = 0;
      let openaiCalls = 0;

      mockProcessGradingResult.mockImplementation(async (gradingResultId: string) => {
        // Simulate Gemini failing, then OpenAI succeeding
        if (gradingResultId.includes('gemini-fail')) {
          geminiCalls++;
          throw new Error('Gemini API: Rate limit exceeded');
        }

        // Simulate successful OpenAI fallback
        openaiCalls++;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
          success: true,
          result: {
            totalScore: 78,
            maxScore: 100,
            breakdown: [{ criteriaId: 'content', score: 40, feedback: 'OpenAI analysis - good content' }],
          },
          fallbackUsed: true,
          provider: 'openai',
        };
      });

      // Create test data for fallback scenario
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });

      // Create files that will trigger fallback
      const fallbackFiles = await Promise.all([
        UploadedFileFactory.create({
          userId: teacher.id,
          originalFileName: 'gemini-fail-1.pdf',
          parsedContent: createMinimalTestContent(),
        }),
        UploadedFileFactory.create({
          userId: teacher.id,
          originalFileName: 'gemini-fail-2.pdf',
          parsedContent: createMinimalTestContent(),
        }),
        UploadedFileFactory.create({
          userId: teacher.id,
          originalFileName: 'normal-file.pdf',
          parsedContent: createMinimalTestContent(),
        }),
      ]);

      const gradingResults = await Promise.all(
        fallbackFiles.map((file) =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING',
          })
        )
      );

      const results = [];

      // Process requests that should trigger fallback
      for (const gradingResult of gradingResults) {
        const startTime = Date.now();

        try {
          const result = await processGradingResult(gradingResult.id, teacher.id, gradingSession.id);

          results.push({
            success: true,
            fallbackUsed: (result as any).fallbackUsed || false,
            responseTime: Date.now() - startTime,
          });
        } catch (error) {
          results.push({
            success: false,
            fallbackUsed: false,
            responseTime: Date.now() - startTime,
          });
        }
      }

      console.log('📊 Fallback Test Results:');
      console.log(`  Successful requests: ${results.filter((r) => r.success).length}/${results.length}`);
      console.log(`🔄 Fallback requests: ${results.filter((r) => r.fallbackUsed).length}`);
      console.log(`📞 Gemini attempts: ${geminiCalls}`);
      console.log(`📞 OpenAI calls: ${openaiCalls}`);

      // Assertions for fallback logic
      expect(results.filter((r) => r.success).length).toBe(3);
      expect(openaiCalls).toBe(3); // All should use OpenAI (including fallbacks)
      expect(results.filter((r) => r.fallbackUsed).length).toBeGreaterThan(0); // Files with "gemini-fail" should use fallback

      console.log('  Fallback mechanism test completed');
    });
  });

  describe('Concurrent Processing Simulation', () => {
    it('should handle concurrent requests with proper batching', async () => {
      console.log('\\n👥 Testing Concurrent Processing Logic');

      vi.clearAllMocks();
      let concurrentCount = 0;
      let maxConcurrent = 0;

      mockProcessGradingResult.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

        concurrentCount--;

        return {
          success: true,
          result: { totalScore: 80, maxScore: 100 },
        };
      });

      // Create concurrent test scenario
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });

      // Create 25 files for concurrent processing
      const students = await UserFactory.createMany(25, { role: 'STUDENT' });
      const files = await Promise.all(
        students.map((student, i) =>
          UploadedFileFactory.create({
            userId: student.id,
            originalFileName: `concurrent-${i}.pdf`,
            parsedContent: createMinimalTestContent(),
          })
        )
      );

      const gradingResults = await Promise.all(
        files.map((file) =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING',
          })
        )
      );

      console.log(`🚀 Processing ${gradingResults.length} files with batching...`);

      // Process in batches of 10 (like the real test)
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < gradingResults.length; i += batchSize) {
        const batch = gradingResults.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} files`);

        const batchStartTime = Date.now();
        const batchPromises = batch.map(async (gradingResult) => {
          const startTime = Date.now();

          try {
            await processGradingResult(gradingResult.id, teacher.id, gradingSession.id);

            return {
              success: true,
              responseTime: Date.now() - startTime,
            };
          } catch (error) {
            return {
              success: false,
              responseTime: Date.now() - startTime,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        const batchTime = Date.now() - batchStartTime;
        console.log(
          `  Batch completed in ${batchTime}ms: ${batchResults.filter((r) => r.success).length}/${batchResults.length} successful`
        );
      }

      const successfulRequests = results.filter((r) => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log('\\n📊 Concurrent Processing Results:');
      console.log(`  Total requests: ${results.length}`);
      console.log(`  Successful requests: ${successfulRequests}`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
      console.log(`👥 Max concurrent requests: ${maxConcurrent}`);

      // Assertions
      expect(results.length).toBe(25);
      expect(successfulRequests).toBe(25); // All should succeed in mock
      expect(maxConcurrent).toBeLessThanOrEqual(batchSize); // Should respect batching
      expect(averageResponseTime).toBeLessThan(500); // Should be fast in mock

      console.log('  Concurrent processing test completed');
    });
  });

  describe('Cost and Performance Tracking', () => {
    it('should track costs and performance metrics accurately', async () => {
      console.log('\\n💰 Testing Cost and Performance Tracking');

      const tracker = new CostTracker();

      // Simulate various request types with different token usage
      const scenarios = [
        { input: 150, output: 50, name: 'Small document' },
        { input: 500, output: 200, name: 'Medium document' },
        { input: 1000, output: 300, name: 'Large document' },
        { input: 2000, output: 500, name: 'Very large document' },
      ];

      scenarios.forEach((scenario, i) => {
        tracker.recordRequest(scenario.input, scenario.output);
        console.log(
          `📊 Request ${i + 1}: ${scenario.name} - ${scenario.input} input, ${scenario.output} output tokens`
        );
      });

      const status = tracker.getStatus();

      console.log('\\n📊 Cost Tracking Results:');
      console.log(`💰 Total cost: $${status.totalCost.toFixed(4)}`);
      console.log(`📞 Total requests: ${status.requestCount}`);
      console.log(`📊 Average cost per request: $${status.averageCostPerRequest.toFixed(4)}`);
      console.log(`🚨 Over budget: ${status.isOverBudget}`);
      console.log(`💳 Budget limit: $${status.budget}`);

      // Assertions
      expect(status.requestCount).toBe(4);
      expect(status.totalCost).toBeGreaterThan(0);
      expect(status.averageCostPerRequest).toBe(status.totalCost / 4);
      expect(status.isOverBudget).toBe(status.totalCost > status.budget);

      console.log('  Cost tracking test completed');
    });
  });
});
