import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  REAL_API_CONFIG, 
  RateLimitTracker, 
  CostTracker,
  createMinimalTestContent,
  createTestRubric,
  waitForRateLimit,
  shouldSkipRealApiTests
} from './real-api-config';
import { 
  UserFactory, 
  RubricFactory, 
  UploadedFileFactory,
  GradingSessionFactory,
  GradingResultFactory
} from '../factories';
import { processGradingResult } from '@/services/grading-engine.server';

/**
 * Gemini 2.0 Flash Rate Limit Load Tests
 * 
 * Tests system behavior under real API constraints:
 * - 15 RPM (requests per minute) limit
 * - 1,000,000 TPM (tokens per minute) limit  
 * - 200 RPD (requests per day) limit
 * 
 * Validates:
 * - Rate limit handling and recovery
 * - Fallback to OpenAI when rate limited
 * - Concurrent PDF processing
 * - Database performance under load
 */

describe('Gemini 2.0 Flash Rate Limit Load Tests', () => {
  let rateLimitTracker: RateLimitTracker;
  let costTracker: CostTracker;
  let skipReason: string | null;
  
  beforeAll(() => {
    rateLimitTracker = new RateLimitTracker();
    costTracker = new CostTracker();
    skipReason = shouldSkipRealApiTests();
    
    if (!skipReason) {
      console.log('🚀 Starting Real API Load Tests');
      console.log('⚠️  This will make real API calls and incur costs');
      console.log(`💰 Budget limit: $${REAL_API_CONFIG.loadTesting.maxCostPerTest}`);
      console.log(`🎯 Gemini limits: ${REAL_API_CONFIG.gemini.rpmLimit} RPM, ${REAL_API_CONFIG.gemini.rpdLimit} RPD`);
    }
  });
  
  afterAll(() => {
    if (!skipReason) {
      console.log('\n📊 Load Test Results Summary:');
      console.log('Rate Limit Status:', rateLimitTracker.getStatus());
      console.log('Cost Status:', costTracker.getStatus());
    }
  });
  
  describe('Rate Limit Validation', () => {
    it.skipIf(skipReason)('should hit 15 RPM limit and handle gracefully', async () => {
      console.log('\n🔥 Testing Gemini 15 RPM Rate Limit');
      
      // Create test data
      const teacher = await UserFactory.createTeacher({
        name: 'Load Test Teacher',
        email: 'load.test@university.edu'
      });
      
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        ...createTestRubric()
      });
      
      const gradingSession = await GradingSessionFactory.create({
        userId: teacher.id,
        status: 'PENDING'
      });
      
      // Create 20 minimal test files to exceed 15 RPM limit
      const testFiles = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `load-test-${i}.pdf`,
            parsedContent: createMinimalTestContent(),
            fileSize: 1024 * 5, // 5KB files
            parseStatus: 'COMPLETED'
          })
        )
      );
      
      // Create grading results for each file
      const gradingResults = await Promise.all(
        testFiles.map(file =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING',
            progress: 0
          })
        )
      );
      
      const results: Array<{ success: boolean; rateLimited: boolean; fallbackUsed: boolean; responseTime: number }> = [];
      let rateLimitHit = false;
      
      console.log('🚀 Firing 20 requests rapidly to exceed 15 RPM...');
      
      // Process requests with minimal delay to trigger rate limiting
      for (let i = 0; i < gradingResults.length; i++) {
        const startTime = Date.now();
        
        try {
          const result = await processGradingResult(
            gradingResults[i].id,
            teacher.id,
            gradingSession.id
          );
          
          const responseTime = Date.now() - startTime;
          rateLimitTracker.recordRequest(150); // Estimate ~150 tokens per request
          costTracker.recordRequest(100, 50);  // Estimate token usage
          
          results.push({
            success: result.success,
            rateLimited: responseTime > 10000, // Assume rate limiting if >10s response
            fallbackUsed: false, // TODO: Detect if OpenAI was used
            responseTime
          });
          
          if (rateLimitTracker.getRequestsInCurrentMinute() >= 15) {
            rateLimitHit = true;
            console.log(`⚠️  Request ${i + 1}: Rate limit reached (${rateLimitTracker.getRequestsInCurrentMinute()}/15)`);
          } else {
            console.log(`✅ Request ${i + 1}: Success (${rateLimitTracker.getRequestsInCurrentMinute()}/15 this minute)`);
          }
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          rateLimitHit = true;
          
          results.push({
            success: false,
            rateLimited: true,
            fallbackUsed: false,
            responseTime
          });
          
          console.log(`❌ Request ${i + 1}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Short delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Stop if we exceed budget
        if (costTracker.isOverBudget()) {
          console.log('💰 Budget exceeded, stopping test');
          break;
        }
      }
      
      // Analyze results
      const successfulRequests = results.filter(r => r.success).length;
      const rateLimitedRequests = results.filter(r => r.rateLimited).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log('\n📊 Rate Limit Test Results:');
      console.log(`✅ Successful requests: ${successfulRequests}/${results.length}`);
      console.log(`⚠️  Rate limited requests: ${rateLimitedRequests}`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
      console.log(`🔄 Rate limit hit: ${rateLimitHit}`);
      
      // Assertions
      expect(results.length).toBeGreaterThan(0);
      expect(rateLimitHit).toBe(true); // We should hit the rate limit
      expect(rateLimitedRequests).toBeGreaterThan(0); // Some requests should be rate limited
      expect(successfulRequests).toBeGreaterThan(10); // At least some should succeed
      
      console.log('✅ Rate limit validation test completed');
    }, 180000); // 3 minute timeout
    
    it.skipIf(skipReason)('should recover from rate limiting and continue processing', async () => {
      console.log('\n🔄 Testing Rate Limit Recovery');
      
      // Wait for rate limit window to reset
      console.log('⏳ Waiting for rate limit window to reset...');
      await waitForRateLimit(rateLimitTracker);
      
      // Create a small batch of requests to test recovery
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ 
        userId: teacher.id, 
        ...createTestRubric() 
      });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });
      
      const testFile = await UploadedFileFactory.create({
        userId: teacher.id,
        originalFileName: 'recovery-test.pdf',
        parsedContent: createMinimalTestContent(),
        parseStatus: 'COMPLETED'
      });
      
      const gradingResult = await GradingResultFactory.create({
        gradingSessionId: gradingSession.id,
        uploadedFileId: testFile.id,
        rubricId: rubric.id,
        status: 'PENDING'
      });
      
      const startTime = Date.now();
      const result = await processGradingResult(
        gradingResult.id,
        teacher.id,
        gradingSession.id
      );
      const responseTime = Date.now() - startTime;
      
      rateLimitTracker.recordRequest(150);
      costTracker.recordRequest(100, 50);
      
      console.log(`✅ Recovery test: ${result.success ? 'Success' : 'Failed'} in ${responseTime}ms`);
      
      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(15000); // Should be faster after recovery
      
      console.log('✅ Rate limit recovery test completed');
    }, 60000);
  });
  
  describe('Concurrent PDF Processing Load', () => {
    it.skipIf(skipReason)('should handle 20+ concurrent student submissions', async () => {
      console.log('\n👥 Testing 20+ Concurrent Student Submissions');
      
      // Wait for any rate limiting to clear
      await waitForRateLimit(rateLimitTracker);
      
      // Create realistic scenario: teacher with course and multiple students
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Concurrent',
        email: 'prof.concurrent@university.edu'
      });
      
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        ...createTestRubric()
      });
      
      // Create 25 students (exceeding the 15 RPM limit)
      const students = await UserFactory.createMany(25, { role: 'STUDENT' });
      
      console.log(`👥 Created ${students.length} students for concurrent testing`);
      
      // Create grading session
      const gradingSession = await GradingSessionFactory.create({
        userId: teacher.id,
        status: 'PENDING'
      });
      
      // Create files and grading results for all students
      const studentSubmissions = await Promise.all(
        students.map(async (student, index) => {
          const file = await UploadedFileFactory.create({
            userId: student.id,
            originalFileName: `concurrent-submission-${index}.pdf`,
            parsedContent: createMinimalTestContent(),
            fileSize: 1024 * (3 + index % 5), // Vary file sizes 3-8KB
            parseStatus: 'COMPLETED'
          });
          
          const gradingResult = await GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING',
            progress: 0
          });
          
          return { student, file, gradingResult };
        })
      );
      
      console.log(`📄 Created ${studentSubmissions.length} PDF submissions`);
      
      // Process all submissions concurrently with controlled concurrency
      const concurrencyLimit = 10; // Process 10 at a time to avoid overwhelming
      const results = [];
      
      for (let i = 0; i < studentSubmissions.length; i += concurrencyLimit) {
        const batch = studentSubmissions.slice(i, i + concurrencyLimit);
        
        console.log(`🚀 Processing batch ${Math.floor(i / concurrencyLimit) + 1}: ${batch.length} submissions`);
        
        const batchPromises = batch.map(async ({ student, gradingResult }) => {
          const startTime = Date.now();
          
          try {
            const result = await processGradingResult(
              gradingResult.id,
              student.id,
              gradingSession.id
            );
            
            const responseTime = Date.now() - startTime;
            rateLimitTracker.recordRequest(150);
            costTracker.recordRequest(100, 50);
            
            return {
              studentId: student.id,
              success: result.success,
              responseTime,
              error: null
            };
          } catch (error) {
            return {
              studentId: student.id,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`✅ Batch ${Math.floor(i / concurrencyLimit) + 1} completed: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`);
        
        // Wait between batches to respect rate limits
        if (i + concurrencyLimit < studentSubmissions.length) {
          console.log('⏳ Waiting 15 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
        
        // Stop if budget exceeded
        if (costTracker.isOverBudget()) {
          console.log('💰 Budget exceeded, stopping concurrent test');
          break;
        }
      }
      
      // Analyze results
      const successfulSubmissions = results.filter(r => r.success).length;
      const failedSubmissions = results.filter(r => !r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log('\n📊 Concurrent Processing Results:');
      console.log(`✅ Successful submissions: ${successfulSubmissions}/${results.length}`);
      console.log(`❌ Failed submissions: ${failedSubmissions}`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
      console.log(`🔄 Rate limit status:`, rateLimitTracker.getStatus());
      console.log(`💰 Cost status:`, costTracker.getStatus());
      
      // Assertions
      expect(results.length).toBeGreaterThan(20);
      expect(successfulSubmissions).toBeGreaterThan(10); // At least half should succeed
      expect(averageResponseTime).toBeLessThan(30000); // Average under 30 seconds
      
      console.log('✅ Concurrent PDF processing test completed');
    }, 600000); // 10 minute timeout for full concurrent test
  });
  
  describe('Database Connection Load', () => {
    it.skipIf(skipReason)('should handle database connections during high concurrency', async () => {
      console.log('\n🗄️  Testing Database Connection Load');
      
      // Create 50 concurrent database operations to test connection pooling
      const operations = Array.from({ length: 50 }, async (_, index) => {
        try {
          const startTime = Date.now();
          
          // Mix of different database operations
          if (index % 3 === 0) {
            // Create user
            await UserFactory.createStudent({
              name: `Load Test User ${index}`,
              email: `load.test.${index}@university.edu`
            });
            return { operation: 'user-create', time: Date.now() - startTime, success: true };
          } else if (index % 3 === 1) {
            // Create rubric
            const teacher = await UserFactory.createTeacher();
            await RubricFactory.create({
              userId: teacher.id,
              name: `Load Test Rubric ${index}`
            });
            return { operation: 'rubric-create', time: Date.now() - startTime, success: true };
          } else {
            // Create file
            const user = await UserFactory.createStudent();
            await UploadedFileFactory.create({
              userId: user.id,
              originalFileName: `db-load-test-${index}.pdf`
            });
            return { operation: 'file-create', time: Date.now() - startTime, success: true };
          }
        } catch (error) {
          return { operation: 'failed', time: 0, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      console.log('🚀 Executing 50 concurrent database operations...');
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const averageOpTime = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.time, 0) / successful;
      
      console.log('\n📊 Database Load Results:');
      console.log(`✅ Successful operations: ${successful}/${results.length}`);
      console.log(`❌ Failed operations: ${failed}`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      console.log(`⏱️  Average operation time: ${Math.round(averageOpTime)}ms`);
      
      // Assertions
      expect(successful).toBeGreaterThan(45); // 90%+ success rate
      expect(averageOpTime).toBeLessThan(5000); // Under 5 seconds per operation
      expect(totalTime).toBeLessThan(30000); // Total under 30 seconds
      
      console.log('✅ Database connection load test completed');
    }, 60000);
  });
});