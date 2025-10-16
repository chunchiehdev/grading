import { describe, it, expect, beforeAll, afterAll, vi, Mock } from 'vitest';
import { createMinimalTestContent, shouldSkipRealApiTests } from './real-api-config';
import { UserFactory, UploadedFileFactory } from '../factories';
import { triggerPdfParsing } from '@/services/pdf-parser.server';

// Mock the dependencies
vi.mock('@/services/storage.server');
vi.mock('node-fetch');

/**
 * PDF Parsing Bottleneck Load Tests
 *
 * Simulates the real PDF parsing pipeline bottlenecks:
 * 1. File retrieval from S3/MinIO storage
 * 2. HTTP POST to https://gradingpdf.grading.software/parse
 * 3. Polling https://gradingpdf.grading.software/task/{taskId}
 * 4. Waiting up to 2 minutes for parsing completion
 *
 * This tests the actual bottlenecks students would experience when
 * multiple PDFs are being processed simultaneously.
 */
describe('PDF Parsing Bottleneck Load Tests', () => {
  let mockFetch: Mock;
  let skipReason: string | null;

  beforeAll(async () => {
    skipReason = shouldSkipRealApiTests();

    // Mock node-fetch
    const { default: fetch } = await import('node-fetch');
    mockFetch = vi.mocked(fetch);

    // Mock S3 client
    const { s3Client } = await import('@/services/storage.server');
    vi.mocked(s3Client.send).mockImplementation(async () => {
      return {
        Body: {
          async *[Symbol.asyncIterator]() {
            const testPdfBuffer = Buffer.from(createMinimalTestContent());
            yield testPdfBuffer;
          },
        },
      } as any;
    });

    if (!skipReason) {
      console.log('🚀 Starting PDF Parsing Bottleneck Tests');
      console.log('📄 Simulating real PDF parsing service bottlenecks');
      console.log(`🌐 Target API: https://gradingpdf.grading.software`);
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (!skipReason) {
      console.log('\\n📊 PDF Parsing Bottleneck Test Summary Complete');
    }
  });

  describe('PDF Parsing Service Bottlenecks', () => {
    it.skipIf(skipReason)(
      'should simulate PDF parsing delays and service load',
      async () => {
        console.log('\\n📄 Testing PDF Parsing Service Delays');

        let apiCallCount = 0;
        const startTime = Date.now();

        // Mock the PDF parsing service responses
        mockFetch.mockImplementation(async (url: string | URL) => {
          apiCallCount++;
          const urlStr = url.toString();

          if (urlStr.includes('/parse')) {
            // Simulate initial parsing submission delay
            await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000)); // 500-1500ms

            return {
              ok: true,
              json: async () => ({ task_id: `task_${Date.now()}_${Math.random()}` }),
            } as any;
          } else if (urlStr.includes('/task/')) {
            // Simulate polling delays - PDF parsing takes time
            const taskCreationTime = Date.now() - startTime;

            // First few polls return 'processing', then 'success'
            if (taskCreationTime < 3000) {
              // First 3 seconds
              await new Promise((resolve) => setTimeout(resolve, 200)); // Polling overhead
              return {
                ok: true,
                json: async () => ({ status: 'processing' }),
              } as any;
            } else if (taskCreationTime < 8000) {
              // 3-8 seconds
              await new Promise((resolve) => setTimeout(resolve, 300)); // Increased polling overhead
              return {
                ok: true,
                json: async () => ({ status: 'processing' }),
              } as any;
            } else {
              // Finally complete after 8+ seconds
              await new Promise((resolve) => setTimeout(resolve, 100));
              return {
                ok: true,
                json: async () => ({
                  status: 'success',
                  content: createMinimalTestContent(),
                }),
              } as any;
            }
          }

          throw new Error(`Unexpected URL: ${urlStr}`);
        });

        const teacher = await UserFactory.createTeacher();
        const testFile = await UploadedFileFactory.create({
          userId: teacher.id,
          originalFileName: 'bottleneck-test.pdf',
          fileName: 'bottleneck-test.pdf',
          fileSize: 5120, // 5KB
          mimeType: 'application/pdf',
          parseStatus: 'PENDING',
          parsedContent: null, // Ensure this is set
        });

        console.log(`📤 Starting PDF parsing simulation for: ${testFile.originalFileName}`);

        const processingStartTime = Date.now();

        await triggerPdfParsing(testFile.id, testFile.fileKey, testFile.originalFileName, teacher.id);

        const totalProcessingTime = Date.now() - processingStartTime;

        console.log(`✅ PDF parsing completed in ${totalProcessingTime}ms`);
        console.log(`📞 Total API calls made: ${apiCallCount}`);
        console.log(`📊 Average time per API call: ${Math.round(totalProcessingTime / apiCallCount)}ms`);

        // Assertions
        expect(totalProcessingTime).toBeGreaterThan(8000); // Should take at least 8 seconds due to simulated processing
        expect(totalProcessingTime).toBeLessThan(15000); // But not too long
        expect(apiCallCount).toBeGreaterThan(5); // Should have made multiple polling calls

        console.log('✅ PDF parsing service delay simulation completed');
      },
      30000
    ); // 30 second timeout

    it.skipIf(skipReason)(
      'should handle concurrent PDF parsing with service bottlenecks',
      async () => {
        console.log('\\n👥 Testing Concurrent PDF Parsing Bottlenecks');

        let totalApiCalls = 0;
        let concurrentApiCalls = 0;
        let maxConcurrentApiCalls = 0;

        // More sophisticated mock that simulates service load
        mockFetch.mockImplementation(async (url: string | URL) => {
          concurrentApiCalls++;
          maxConcurrentApiCalls = Math.max(maxConcurrentApiCalls, concurrentApiCalls);
          totalApiCalls++;

          const urlStr = url.toString();

          try {
            if (urlStr.includes('/parse')) {
              // Simulate service load - more concurrent requests = slower response
              const loadDelay = 300 + concurrentApiCalls * 100; // Base 300ms + 100ms per concurrent request
              await new Promise((resolve) => setTimeout(resolve, loadDelay));

              return {
                ok: true,
                json: async () => ({ task_id: `task_${totalApiCalls}_${Date.now()}` }),
              } as any;
            } else if (urlStr.includes('/task/')) {
              // Simulate polling with service under load
              const pollDelay = 200 + concurrentApiCalls * 50; // Polling gets slower under load
              await new Promise((resolve) => setTimeout(resolve, pollDelay));

              // Randomly decide if parsing is complete (simulate variable processing times)
              const isComplete = Math.random() > 0.7; // 30% chance to complete each poll

              if (isComplete) {
                return {
                  ok: true,
                  json: async () => ({
                    status: 'success',
                    content: createMinimalTestContent() + ` (processed by call ${totalApiCalls})`,
                  }),
                } as any;
              } else {
                return {
                  ok: true,
                  json: async () => ({ status: 'processing' }),
                } as any;
              }
            }

            throw new Error(`Unexpected URL: ${urlStr}`);
          } finally {
            concurrentApiCalls--;
          }
        });

        const teacher = await UserFactory.createTeacher();

        // Create 8 files for concurrent processing
        const testFiles = await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            UploadedFileFactory.create({
              userId: teacher.id,
              originalFileName: `concurrent-bottleneck-${i + 1}.pdf`,
              fileName: `concurrent-bottleneck-${i + 1}.pdf`,
              fileSize: 3072 + i * 512, // Varying file sizes 3KB-6.5KB
              mimeType: 'application/pdf',
              parseStatus: 'PENDING',
            })
          )
        );

        console.log(`📤 Starting concurrent PDF parsing for ${testFiles.length} files`);

        const concurrentStartTime = Date.now();

        // Process all files concurrently to create service bottleneck
        const parsingPromises = testFiles.map(async (file, index) => {
          const fileStartTime = Date.now();

          try {
            await triggerPdfParsing(file.id, file.fileKey, file.originalFileName, teacher.id);

            const fileProcessingTime = Date.now() - fileStartTime;

            return {
              index,
              fileName: file.originalFileName,
              success: true,
              processingTime: fileProcessingTime,
            };
          } catch (error) {
            return {
              index,
              fileName: file.originalFileName,
              success: false,
              processingTime: Date.now() - fileStartTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const results = await Promise.all(parsingPromises);
        const totalConcurrentTime = Date.now() - concurrentStartTime;

        // Analyze bottleneck results
        const successfulFiles = results.filter((r) => r.success);
        const failedFiles = results.filter((r) => !r.success);
        const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
        const maxProcessingTime = Math.max(...results.map((r) => r.processingTime));
        const minProcessingTime = Math.min(...results.map((r) => r.processingTime));

        console.log('\\n📊 Concurrent PDF Parsing Bottleneck Results:');
        console.log(`✅ Successfully parsed: ${successfulFiles.length}/${results.length} files`);
        console.log(`❌ Failed to parse: ${failedFiles.length} files`);
        console.log(`⏱️  Total concurrent processing time: ${totalConcurrentTime}ms`);
        console.log(`📊 Average processing time per file: ${Math.round(averageProcessingTime)}ms`);
        console.log(`📊 Processing time range: ${minProcessingTime}ms - ${maxProcessingTime}ms`);
        console.log(`📞 Total API calls made: ${totalApiCalls}`);
        console.log(`👥 Max concurrent API calls: ${maxConcurrentApiCalls}`);
        console.log(`📈 API calls per file: ${Math.round(totalApiCalls / testFiles.length)}`);

        // Log individual file results
        results.forEach((result) => {
          const status = result.success ? '✅' : '❌';
          console.log(`   ${status} File ${result.index + 1}: ${result.processingTime}ms`);
        });

        // Bottleneck validation assertions
        expect(results.length).toBe(8);
        expect(successfulFiles.length).toBeGreaterThan(6); // Most should succeed despite bottlenecks
        expect(maxConcurrentApiCalls).toBeGreaterThan(5); // Should achieve good concurrency
        expect(averageProcessingTime).toBeGreaterThan(2000); // Should show bottleneck effects (slower than single file)
        expect(totalApiCalls).toBeGreaterThan(20); // Should demonstrate significant API load

        console.log('✅ Concurrent PDF parsing bottleneck test completed');
      },
      60000
    ); // 1 minute timeout

    it.skipIf(skipReason)(
      'should simulate PDF parsing service failures and recovery',
      async () => {
        console.log('\\n💥 Testing PDF Parsing Service Failures');

        let apiCallCount = 0;
        const failureRate = 0.3; // 30% API failure rate

        mockFetch.mockImplementation(async (url: string | URL) => {
          apiCallCount++;
          const urlStr = url.toString();

          // Simulate random service failures
          if (Math.random() < failureRate) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before failure
            throw new Error('PDF parsing service temporarily unavailable');
          }

          if (urlStr.includes('/parse')) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            return {
              ok: true,
              json: async () => ({ task_id: `task_failure_test_${apiCallCount}` }),
            } as any;
          } else if (urlStr.includes('/task/')) {
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Sometimes return failure status
            if (Math.random() < 0.1) {
              // 10% chance of parsing failure
              return {
                ok: true,
                json: async () => ({
                  status: 'failed',
                  error: 'PDF format not supported or file corrupted',
                }),
              } as any;
            }

            // Most times return success after some processing
            if (apiCallCount % 3 === 0) {
              // Complete every 3rd call
              return {
                ok: true,
                json: async () => ({
                  status: 'success',
                  content: createMinimalTestContent(),
                }),
              } as any;
            } else {
              return {
                ok: true,
                json: async () => ({ status: 'processing' }),
              } as any;
            }
          }

          throw new Error(`Unexpected URL: ${urlStr}`);
        });

        const teacher = await UserFactory.createTeacher();

        // Test 5 files to see how service handles failures
        const testFiles = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            UploadedFileFactory.create({
              userId: teacher.id,
              originalFileName: `failure-test-${i + 1}.pdf`,
              fileName: `failure-test-${i + 1}.pdf`,
              fileSize: 4096,
              mimeType: 'application/pdf',
              parseStatus: 'PENDING',
            })
          )
        );

        console.log(`📤 Testing PDF parsing with ${Math.round(failureRate * 100)}% service failure rate`);

        const failureResults = [];

        for (const [index, file] of testFiles.entries()) {
          const fileStartTime = Date.now();

          try {
            console.log(`🔄 Processing file ${index + 1}/${testFiles.length}: ${file.originalFileName}`);

            await triggerPdfParsing(file.id, file.fileKey, file.originalFileName, teacher.id);

            const processingTime = Date.now() - fileStartTime;
            failureResults.push({
              fileName: file.originalFileName,
              success: true,
              processingTime,
              error: null,
            });

            console.log(`   ✅ Completed in ${processingTime}ms`);
          } catch (error) {
            const processingTime = Date.now() - fileStartTime;
            failureResults.push({
              fileName: file.originalFileName,
              success: false,
              processingTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            console.log(
              `   ❌ Failed in ${processingTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }

          // Brief delay between attempts
          if (index < testFiles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        const successfulParses = failureResults.filter((r) => r.success).length;
        const failedParses = failureResults.filter((r) => !r.success).length;
        const averageProcessingTime =
          failureResults.reduce((sum, r) => sum + r.processingTime, 0) / failureResults.length;

        console.log('\\n📊 PDF Parsing Service Failure Test Results:');
        console.log(`✅ Successfully parsed: ${successfulParses}/${failureResults.length} files`);
        console.log(`❌ Failed to parse: ${failedParses} files`);
        console.log(`📊 Success rate: ${Math.round((successfulParses / failureResults.length) * 100)}%`);
        console.log(`⏱️  Average processing time: ${Math.round(averageProcessingTime)}ms`);
        console.log(`📞 Total API calls with failures: ${apiCallCount}`);

        // Should handle failures gracefully - some success despite high failure rate
        expect(failureResults.length).toBe(5);
        expect(successfulParses).toBeGreaterThan(0); // At least some should succeed despite failures
        expect(averageProcessingTime).toBeGreaterThan(1000); // Should show retry delays

        console.log('✅ PDF parsing service failure handling test completed');
      },
      45000
    ); // 45 second timeout
  });

  describe('Real-World PDF Processing Scenarios', () => {
    it.skipIf(skipReason)(
      'should simulate classroom assignment submission rush',
      async () => {
        console.log('\\n🏫 Simulating Classroom Assignment Submission Rush');

        // Simulate a realistic scenario: 25 students submitting just before deadline
        let serviceLoad = 0;
        let peakLoad = 0;
        let totalServiceTime = 0;
        let apiCallCount = 0;

        mockFetch.mockImplementation(async (url: string | URL) => {
          serviceLoad++;
          peakLoad = Math.max(peakLoad, serviceLoad);
          apiCallCount++;

          const urlStr = url.toString();
          const serviceStartTime = Date.now();

          try {
            if (urlStr.includes('/parse')) {
              // Simulate submission queue delay based on current load
              const queueDelay = 500 + serviceLoad * 150; // 500ms + 150ms per concurrent request
              await new Promise((resolve) => setTimeout(resolve, queueDelay));

              const serviceTime = Date.now() - serviceStartTime;
              totalServiceTime += serviceTime;

              return {
                ok: true,
                json: async () => ({ task_id: `rush_${apiCallCount}_${Date.now()}` }),
              } as any;
            } else if (urlStr.includes('/task/')) {
              // Polling delay increases with service load
              const pollDelay = 250 + serviceLoad * 75;
              await new Promise((resolve) => setTimeout(resolve, pollDelay));

              const serviceTime = Date.now() - serviceStartTime;
              totalServiceTime += serviceTime;

              // Complete after a few polls (simulate realistic processing time)
              const shouldComplete = Math.random() > 0.6; // 40% chance each poll

              if (shouldComplete) {
                return {
                  ok: true,
                  json: async () => ({
                    status: 'success',
                    content: createMinimalTestContent() + `\\n\\nProcessed during rush hour.`,
                  }),
                } as any;
              } else {
                return {
                  ok: true,
                  json: async () => ({ status: 'processing' }),
                } as any;
              }
            }

            throw new Error(`Unexpected URL: ${urlStr}`);
          } finally {
            serviceLoad--;
          }
        });

        const teacher = await UserFactory.createTeacher({
          name: 'Prof. Deadline',
          email: 'prof.deadline@university.edu',
        });

        // Create 15 students submitting assignments (realistic classroom size)
        const students = await UserFactory.createMany(15, { role: 'STUDENT' });

        const rushFiles = await Promise.all(
          students.map(async (student, i) =>
            UploadedFileFactory.create({
              userId: student.id,
              originalFileName: `assignment-${i + 1}.pdf`,
              fileName: `assignment-${i + 1}.pdf`,
              fileSize: 4096 + i * 256, // Varying sizes 4-8KB
              mimeType: 'application/pdf',
              parseStatus: 'PENDING',
            })
          )
        );

        console.log(`📚 Simulating ${rushFiles.length} students submitting assignments simultaneously`);
        console.log('🕒 This simulates the last-minute submission rush before a deadline');

        const rushStartTime = Date.now();

        // All students submit at once (realistic deadline scenario)
        const rushPromises = rushFiles.map(async (file, index) => {
          // Stagger submissions slightly (students don't submit at exactly the same millisecond)
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000)); // 0-2 second stagger

          const fileStartTime = Date.now();

          try {
            await triggerPdfParsing(file.id, file.fileKey, file.originalFileName, teacher.id);

            return {
              studentIndex: index + 1,
              fileName: file.originalFileName,
              success: true,
              processingTime: Date.now() - fileStartTime,
              submissionDelay: fileStartTime - rushStartTime,
            };
          } catch (error) {
            return {
              studentIndex: index + 1,
              fileName: file.originalFileName,
              success: false,
              processingTime: Date.now() - fileStartTime,
              submissionDelay: fileStartTime - rushStartTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const rushResults = await Promise.all(rushPromises);
        const totalRushTime = Date.now() - rushStartTime;

        // Analyze rush hour performance
        const successfulSubmissions = rushResults.filter((r) => r.success).length;
        const failedSubmissions = rushResults.filter((r) => !r.success).length;
        const averageProcessingTime = rushResults.reduce((sum, r) => sum + r.processingTime, 0) / rushResults.length;
        const maxProcessingTime = Math.max(...rushResults.map((r) => r.processingTime));
        const averageServiceTime = totalServiceTime / apiCallCount;

        console.log('\\n📊 Assignment Submission Rush Results:');
        console.log(`🎓 Students who submitted successfully: ${successfulSubmissions}/${rushResults.length}`);
        console.log(`❌ Failed submissions: ${failedSubmissions}`);
        console.log(`⏱️  Total rush duration: ${Math.round(totalRushTime / 1000)}s`);
        console.log(`📊 Average processing time per student: ${Math.round(averageProcessingTime / 1000)}s`);
        console.log(`📊 Longest processing time: ${Math.round(maxProcessingTime / 1000)}s`);
        console.log(`🔥 Peak service load: ${peakLoad} concurrent requests`);
        console.log(`⚡ Average service response time: ${Math.round(averageServiceTime)}ms`);
        console.log(`📞 Total API calls during rush: ${apiCallCount}`);

        // Show submission timeline
        console.log('\\n📅 Submission Timeline:');
        rushResults
          .sort((a, b) => a.submissionDelay - b.submissionDelay)
          .slice(0, 5) // Show first 5
          .forEach((result) => {
            const status = result.success ? '✅' : '❌';
            console.log(
              `   ${status} Student ${result.studentIndex}: +${Math.round(result.submissionDelay / 1000)}s, processed in ${Math.round(result.processingTime / 1000)}s`
            );
          });

        if (rushResults.length > 5) {
          console.log(`   ... and ${rushResults.length - 5} more students`);
        }

        // Real-world performance assertions
        expect(rushResults.length).toBe(15);
        expect(successfulSubmissions).toBeGreaterThan(12); // 80%+ success rate expected
        expect(peakLoad).toBeGreaterThan(8); // Should achieve good concurrency
        expect(averageProcessingTime).toBeLessThan(30000); // Average under 30 seconds
        expect(totalRushTime).toBeLessThan(60000); // Entire rush should complete within 1 minute

        console.log('✅ Assignment submission rush simulation completed');
      },
      120000
    ); // 2 minute timeout
  });
});
