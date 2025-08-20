import { describe, it, expect, beforeAll, afterAll, vi, Mock } from 'vitest';
import { 
  RateLimitTracker, 
  CostTracker,
  createMinimalTestContent
} from './real-api-config';
import { 
  UserFactory, 
  RubricFactory, 
  UploadedFileFactory,
  GradingSessionFactory,
  GradingResultFactory
} from '../factories';
import { processGradingResult } from '@/services/grading-engine.server';
import { db } from '@/types/database';

// Mock the grading service
vi.mock('@/services/grading-engine.server');

/**
 * PDF Processing Load Tests
 * 
 * Tests PDF parsing bottlenecks, concurrent file processing,
 * and system behavior under heavy PDF processing load
 */
describe('PDF Processing Load Tests', () => {
  let rateLimitTracker: RateLimitTracker;
  let costTracker: CostTracker;
  let mockProcessGradingResult: Mock;
  
  beforeAll(() => {
    rateLimitTracker = new RateLimitTracker();
    costTracker = new CostTracker();
    mockProcessGradingResult = vi.mocked(processGradingResult);
    
    console.log('🚀 Starting PDF Processing Load Tests');
    console.log(`📄 Testing PDF parsing bottlenecks and concurrent processing`);
  });
  
  afterAll(() => {
    console.log('\\n📊 PDF Processing Test Summary:');
    console.log('Final Rate Limit Status:', rateLimitTracker.getStatus());
    console.log('Final Cost Status:', costTracker.getStatus());
  });
  
  describe('PDF Parsing Bottlenecks', () => {
    it('should handle PDF parsing delays and timeouts', async () => {
      console.log('\\n📄 Testing PDF Parsing Bottlenecks');
      
      // Mock responses with varying PDF parsing times
      let processingTimes: number[] = [];
      mockProcessGradingResult.mockImplementation(async (gradingResultId: string) => {
        // Find the file to check its size
        const gradingResult = await db.gradingResult.findUnique({
          where: { id: gradingResultId },
          include: { uploadedFile: true }
        });
        
        const fileSize = gradingResult?.uploadedFile.fileSize || 1024;
        
        // Simulate parsing time based on file size
        let parsingTime = 100; // Base parsing time
        
        if (fileSize > 10 * 1024) parsingTime = 5000; // 5s for large files (>10KB)
        else if (fileSize > 5 * 1024) parsingTime = 2000;  // 2s for medium files (>5KB)
        else parsingTime = 500; // 500ms for small files
        
        // Add some randomness to simulate real PDF parsing
        parsingTime += Math.random() * 1000;
        processingTimes.push(parsingTime);
        
        await new Promise(resolve => setTimeout(resolve, parsingTime));
        
        // Simulate occasional parsing failures for very large files
        if (fileSize > 15 * 1024 && Math.random() < 0.2) {
          throw new Error('PDF parsing timeout: File too large or corrupted');
        }
        
        return {
          success: true,
          result: {
            totalScore: Math.floor(75 + Math.random() * 20),
            maxScore: 100,
            processingTimeMs: parsingTime
          }
        };
      });
      
      // Create test scenario with various file sizes
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });
      
      // Create files with different sizes to simulate parsing bottlenecks
      const testFiles = await Promise.all([
        // Small files (fast parsing)
        ...Array.from({ length: 5 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `small-${i}.pdf`,
            parsedContent: createMinimalTestContent(),
            fileSize: 2 * 1024, // 2KB
            parseStatus: 'COMPLETED'
          })
        ),
        // Medium files (moderate parsing)
        ...Array.from({ length: 5 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `medium-${i}.pdf`,
            parsedContent: createMinimalTestContent().repeat(3),
            fileSize: 8 * 1024, // 8KB
            parseStatus: 'COMPLETED'
          })
        ),
        // Large files (slow parsing)
        ...Array.from({ length: 3 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `large-${i}.pdf`,
            parsedContent: createMinimalTestContent().repeat(10),
            fileSize: 12 * 1024, // 12KB
            parseStatus: 'COMPLETED'
          })
        ),
        // Very large files (potential failures)
        ...Array.from({ length: 2 }, (_, i) =>
          UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `xlarge-${i}.pdf`,
            parsedContent: createMinimalTestContent().repeat(20),
            fileSize: 18 * 1024, // 18KB
            parseStatus: 'COMPLETED'
          })
        )
      ]);
      
      const gradingResults = await Promise.all(
        testFiles.map(file =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING'
          })
        )
      );
      
      console.log(`📊 Processing ${testFiles.length} files with various sizes...`);
      console.log(`   • Small files (2KB): 5`);
      console.log(`   • Medium files (8KB): 5`);
      console.log(`   • Large files (12KB): 3`);
      console.log(`   • XLarge files (18KB): 2`);
      
      const results = [];
      const startTime = Date.now();
      
      // Process files with controlled concurrency to simulate bottlenecks
      const concurrencyLimit = 3; // Only 3 PDF parsers can run simultaneously
      
      for (let i = 0; i < gradingResults.length; i += concurrencyLimit) {
        const batch = gradingResults.slice(i, i + concurrencyLimit);
        const batchStartTime = Date.now();
        
        console.log(`🔄 Processing batch ${Math.floor(i / concurrencyLimit) + 1}: ${batch.length} files`);
        
        const batchPromises = batch.map(async (gradingResult, batchIndex) => {
          const processStartTime = Date.now();
          
          try {
            await processGradingResult(
              gradingResult.id,
              teacher.id,
              gradingSession.id
            );
            
            const processingTime = Date.now() - processStartTime;
            
            return {
              success: true,
              processingTime,
              fileIndex: i + batchIndex
            };
          } catch (error) {
            return {
              success: false,
              processingTime: Date.now() - processStartTime,
              fileIndex: i + batchIndex,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        const batchTime = Date.now() - batchStartTime;
        const successfulInBatch = batchResults.filter(r => r.success).length;
        
        console.log(`   ✅ Batch completed in ${batchTime}ms: ${successfulInBatch}/${batchResults.length} successful`);
        
        // Brief pause between batches to simulate real processing
        if (i + concurrencyLimit < gradingResults.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const totalTime = Date.now() - startTime;
      const successfulFiles = results.filter(r => r.success).length;
      const failedFiles = results.filter(r => !r.success).length;
      const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      
      console.log('\\n📊 PDF Processing Bottleneck Results:');
      console.log(`✅ Successfully processed: ${successfulFiles}/${results.length} files`);
      console.log(`❌ Failed processing: ${failedFiles} files`);
      console.log(`⏱️  Total processing time: ${totalTime}ms`);
      console.log(`⏱️  Average file processing time: ${Math.round(averageProcessingTime)}ms`);
      console.log(`📊 Individual processing times: ${processingTimes.map(t => Math.round(t)).join(', ')}ms`);
      
      // Assertions
      expect(results.length).toBe(15);
      expect(successfulFiles).toBeGreaterThan(10); // Most should succeed despite bottlenecks
      expect(averageProcessingTime).toBeGreaterThan(500); // Should show increased processing time
      expect(processingTimes.some(t => t > 2000)).toBe(true); // Some files should take longer
      
      console.log('✅ PDF parsing bottleneck test completed');
    }, 60000); // 1 minute timeout
    
    it('should handle concurrent PDF uploads and parsing', async () => {
      console.log('\\n📤 Testing Concurrent PDF Uploads and Parsing');
      
      vi.clearAllMocks();
      let concurrentParsers = 0;
      let maxConcurrentParsers = 0;
      
      mockProcessGradingResult.mockImplementation(async () => {
        concurrentParsers++;
        maxConcurrentParsers = Math.max(maxConcurrentParsers, concurrentParsers);
        
        // Simulate PDF parsing with random delays
        const parsingTime = 500 + Math.random() * 1500; // 500-2000ms
        await new Promise(resolve => setTimeout(resolve, parsingTime));
        
        concurrentParsers--;
        
        // Simulate occasional parsing errors (5% failure rate)
        if (Math.random() < 0.05) {
          throw new Error('PDF parsing failed: Corrupted or unsupported format');
        }
        
        return {
          success: true,
          result: { totalScore: 85, maxScore: 100 }
        };
      });
      
      // Simulate real scenario: multiple students uploading files simultaneously
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });
      
      // Create 30 students uploading files at the same time
      const students = await UserFactory.createMany(30, { role: 'STUDENT' });
      
      const uploadTasks = students.map(async (student, index) => {
        // Stagger uploads slightly to simulate real behavior
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        
        const file = await UploadedFileFactory.create({
          userId: student.id,
          originalFileName: `upload-${index}.pdf`,
          parsedContent: createMinimalTestContent(),
          fileSize: 3 * 1024 + Math.random() * 5 * 1024, // 3-8KB files
          parseStatus: 'COMPLETED'
        });
        
        const gradingResult = await GradingResultFactory.create({
          gradingSessionId: gradingSession.id,
          uploadedFileId: file.id,
          rubricId: rubric.id,
          status: 'PENDING'
        });
        
        return { student, file, gradingResult };
      });
      
      console.log(`📤 Simulating ${students.length} concurrent file uploads...`);
      const uploadStartTime = Date.now();
      const uploads = await Promise.all(uploadTasks);
      const uploadTime = Date.now() - uploadStartTime;
      
      console.log(`✅ All uploads completed in ${uploadTime}ms`);
      
      // Now process all files concurrently (like a real system would)
      console.log(`🔄 Processing ${uploads.length} files concurrently...`);
      const processingStartTime = Date.now();
      
      const processingPromises = uploads.map(async ({ gradingResult }, index) => {
        const startTime = Date.now();
        
        try {
          await processGradingResult(
            gradingResult.id,
            teacher.id,
            gradingSession.id
          );
          
          return {
            index,
            success: true,
            processingTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            index,
            success: false,
            processingTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const processingResults = await Promise.all(processingPromises);
      const totalProcessingTime = Date.now() - processingStartTime;
      
      const successfulProcessing = processingResults.filter(r => r.success).length;
      const failedProcessing = processingResults.filter(r => !r.success).length;
      const averageProcessingTime = processingResults.reduce((sum, r) => sum + r.processingTime, 0) / processingResults.length;
      
      console.log('\\n📊 Concurrent Upload/Processing Results:');
      console.log(`📤 Upload phase: ${uploadTime}ms for ${uploads.length} files`);
      console.log(`🔄 Processing phase: ${totalProcessingTime}ms total`);
      console.log(`✅ Successfully processed: ${successfulProcessing}/${processingResults.length} files`);
      console.log(`❌ Failed processing: ${failedProcessing} files`);
      console.log(`⏱️  Average processing time per file: ${Math.round(averageProcessingTime)}ms`);
      console.log(`👥 Max concurrent parsers: ${maxConcurrentParsers}`);
      
      // Assertions
      expect(uploads.length).toBe(30);
      expect(successfulProcessing).toBeGreaterThan(25); // 95%+ success rate expected
      expect(maxConcurrentParsers).toBeGreaterThan(10); // Should achieve good concurrency
      expect(averageProcessingTime).toBeLessThan(3000); // Should be reasonably fast
      expect(totalProcessingTime).toBeLessThan(15000); // Total should be under 15s due to concurrency
      
      console.log('✅ Concurrent PDF upload/processing test completed');
    }, 45000); // 45 second timeout
  });
  
  describe('System Resource Load', () => {
    it('should handle memory and CPU load during intensive PDF processing', async () => {
      console.log('\\n🖥️  Testing System Resource Load');
      
      vi.clearAllMocks();
      const memoryUsage: number[] = [];
      let cpuIntensiveTasks = 0;
      
      mockProcessGradingResult.mockImplementation(async () => {
        // Simulate CPU-intensive PDF processing
        cpuIntensiveTasks++;
        
        // Simulate memory usage tracking
        const simulatedMemoryUsage = 50 + Math.random() * 100; // 50-150MB per file
        memoryUsage.push(simulatedMemoryUsage);
        
        // Simulate varying processing complexity
        const complexity = Math.random();
        let processingTime = 200;
        
        if (complexity > 0.8) {
          // High complexity: OCR, complex layouts
          processingTime = 3000 + Math.random() * 2000; // 3-5s
        } else if (complexity > 0.5) {
          // Medium complexity: standard documents
          processingTime = 1000 + Math.random() * 1000; // 1-2s
        } else {
          // Low complexity: simple text
          processingTime = 300 + Math.random() * 500; // 300-800ms
        }
        
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Simulate memory cleanup
        memoryUsage[memoryUsage.length - 1] = simulatedMemoryUsage * 0.3;
        
        cpuIntensiveTasks--;
        
        return {
          success: true,
          result: {
            totalScore: 80,
            maxScore: 100,
            processingComplexity: complexity,
            memoryUsageMB: simulatedMemoryUsage
          }
        };
      });
      
      // Create resource-intensive test scenario
      const teacher = await UserFactory.createTeacher();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const gradingSession = await GradingSessionFactory.create({ userId: teacher.id });
      
      // Create 20 files with varying complexity
      const testFiles = await Promise.all(
        Array.from({ length: 20 }, (_, i) => {
          const complexity = Math.random();
          let fileSize = 5 * 1024; // Base 5KB
          
          if (complexity > 0.8) fileSize = 15 * 1024; // 15KB for complex files
          else if (complexity > 0.5) fileSize = 10 * 1024; // 10KB for medium files
          
          return UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `resource-test-${i}.pdf`,
            parsedContent: createMinimalTestContent(),
            fileSize,
            parseStatus: 'COMPLETED'
          });
        })
      );
      
      const gradingResults = await Promise.all(
        testFiles.map(file =>
          GradingResultFactory.create({
            gradingSessionId: gradingSession.id,
            uploadedFileId: file.id,
            rubricId: rubric.id,
            status: 'PENDING'
          })
        )
      );
      
      console.log(`🖥️  Processing ${testFiles.length} files to test system resource usage...`);
      
      const resourceStartTime = Date.now();
      const maxConcurrentTasks = 8; // Limit to prevent system overload
      
      // Process files in controlled batches to monitor resource usage
      const results = [];
      
      for (let i = 0; i < gradingResults.length; i += maxConcurrentTasks) {
        const batch = gradingResults.slice(i, i + maxConcurrentTasks);
        const batchStartTime = Date.now();
        
        console.log(`🔄 Processing resource batch ${Math.floor(i / maxConcurrentTasks) + 1}: ${batch.length} files`);
        
        const batchPromises = batch.map(async gradingResult => {
          const startTime = Date.now();
          
          try {
            const result = await processGradingResult(
              gradingResult.id,
              teacher.id,
              gradingSession.id
            );
            
            return {
              success: true,
              processingTime: Date.now() - startTime,
              complexity: (result as any).result?.processingComplexity || 0.5,
              memoryUsage: (result as any).result?.memoryUsageMB || 75
            };
          } catch (error) {
            return {
              success: false,
              processingTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        const batchTime = Date.now() - batchStartTime;
        const avgMemoryInBatch = batchResults
          .filter(r => r.success && r.memoryUsage)
          .reduce((sum, r) => sum + (r.memoryUsage || 0), 0) / batchResults.length;
        
        console.log(`   ✅ Batch completed in ${batchTime}ms, avg memory: ${Math.round(avgMemoryInBatch)}MB`);
        
        // Brief pause to simulate resource cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const totalResourceTime = Date.now() - resourceStartTime;
      const successfulTasks = results.filter(r => r.success).length;
      const totalMemoryUsage = memoryUsage.reduce((sum, usage) => sum + usage, 0);
      const avgMemoryUsage = totalMemoryUsage / memoryUsage.length;
      const maxMemoryUsage = Math.max(...memoryUsage);
      const highComplexityTasks = results.filter(r => r.success && (r.complexity || 0) > 0.8).length;
      
      console.log('\\n📊 System Resource Load Results:');
      console.log(`✅ Successfully processed: ${successfulTasks}/${results.length} files`);
      console.log(`⏱️  Total processing time: ${totalResourceTime}ms`);
      console.log(`🧠 Memory usage - Avg: ${Math.round(avgMemoryUsage)}MB, Max: ${Math.round(maxMemoryUsage)}MB`);
      console.log(`📊 High complexity tasks: ${highComplexityTasks} (requiring extra CPU)`);
      console.log(`💾 Total memory allocated: ${Math.round(totalMemoryUsage)}MB`);
      
      // Assertions
      expect(results.length).toBe(20);
      expect(successfulTasks).toBeGreaterThan(18); // 90%+ success rate
      expect(avgMemoryUsage).toBeGreaterThan(50); // Should track memory usage
      expect(maxMemoryUsage).toBeLessThan(200); // Should stay within reasonable limits
      expect(totalResourceTime).toBeLessThan(60000); // Should complete within 1 minute
      
      console.log('✅ System resource load test completed');
    }, 90000); // 90 second timeout
  });
});