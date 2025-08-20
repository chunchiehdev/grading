import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { 
  REAL_API_CONFIG, 
  createMinimalTestContent,
  shouldSkipRealApiTests
} from './real-api-config';
import { 
  UserFactory, 
  UploadedFileFactory
} from '../factories';
import { triggerPdfParsing } from '@/services/pdf-parser.server';
import { db } from '@/types/database';

/**
 * Real PDF Parsing Load Tests
 * 
 * Tests the actual PDF parsing service at https://gradingpdf.grading.software
 * Validates parsing bottlenecks, concurrent processing, and timeout handling
 * under real production conditions.
 * 
 * IMPORTANT: These tests make real HTTP requests to the PDF parsing service
 * and require proper environment configuration.
 */
describe('Real PDF Parsing Load Tests', () => {
  let skipReason: string | null;
  
  beforeAll(() => {
    skipReason = shouldSkipRealApiTests();
    
    if (!skipReason) {
      console.log('🚀 Starting Real PDF Parsing Load Tests');
      console.log('📄 Testing actual PDF parsing service');
      console.log(`🌐 PDF Parser API: ${process.env.PDF_PARSER_API_URL || 'http://localhost:8000'}`);
    }
  });
  
  afterAll(() => {
    if (!skipReason) {
      console.log('\\n📊 Real PDF Parsing Test Summary Complete');
    }
  });
  
  describe('PDF Parsing Service Integration', () => {
    it.skipIf(skipReason)('should handle single PDF parsing through real service', async () => {
      console.log('\\n📄 Testing Single PDF Parsing');
      
      // Create a test file that will be uploaded to storage
      const teacher = await UserFactory.createTeacher({
        name: 'PDF Test Teacher',
        email: 'pdf.test@university.edu'
      });
      
      // Create minimal PDF content for testing
      const testPdfContent = createMinimalTestContent();
      
      const uploadedFile = await UploadedFileFactory.create({
        userId: teacher.id,
        originalFileName: 'single-test.pdf',
        fileName: 'single-test.pdf',
        fileSize: Buffer.byteLength(testPdfContent, 'utf8'),
        mimeType: 'application/pdf',
        parseStatus: 'PENDING',
        parsedContent: null
      });
      
      console.log(`📤 Created test file: ${uploadedFile.originalFileName}`);
      console.log(`🔑 File key: ${uploadedFile.fileKey}`);
      console.log(`📊 File size: ${uploadedFile.fileSize} bytes`);
      
      const startTime = Date.now();
      
      try {
        // This will make real HTTP requests to the PDF parsing service
        await triggerPdfParsing(
          uploadedFile.id,
          uploadedFile.fileKey,
          uploadedFile.originalFileName,
          teacher.id
        );
        
        const processingTime = Date.now() - startTime;
        
        // Verify the file was parsed successfully
        const updatedFile = await db.uploadedFile.findUnique({
          where: { id: uploadedFile.id }
        });
        
        console.log(`✅ PDF parsing completed in ${processingTime}ms`);
        console.log(`📝 Parsed content length: ${updatedFile?.parsedContent?.length || 0} characters`);
        console.log(`📊 Parse status: ${updatedFile?.parseStatus}`);
        
        // Assertions
        expect(updatedFile?.parseStatus).toBe('COMPLETED');
        expect(updatedFile?.parsedContent).toBeTruthy();
        expect(updatedFile?.parsedContent!.length).toBeGreaterThan(0);
        expect(processingTime).toBeLessThan(120000); // Should complete within 2 minutes
        
        console.log('✅ Single PDF parsing test completed');
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ PDF parsing failed after ${processingTime}ms:`, error);
        
        // Check if file status was updated to FAILED
        const failedFile = await db.uploadedFile.findUnique({
          where: { id: uploadedFile.id }
        });
        
        expect(failedFile?.parseStatus).toBe('FAILED');
        expect(failedFile?.parseError).toBeTruthy();
        
        throw error;
      }
    }, 150000); // 2.5 minute timeout
    
    it.skipIf(skipReason)('should handle concurrent PDF parsing requests', async () => {
      console.log('\\n👥 Testing Concurrent PDF Parsing');
      
      const teacher = await UserFactory.createTeacher({
        name: 'Concurrent PDF Teacher',
        email: 'concurrent.pdf@university.edu'
      });
      
      // Create 5 test files for concurrent parsing
      const testFiles = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const content = createMinimalTestContent() + `\\n\\nFile ${i + 1} specific content.`;
          
          return UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `concurrent-${i + 1}.pdf`,
            fileName: `concurrent-${i + 1}.pdf`,
            fileSize: Buffer.byteLength(content, 'utf8'),
            mimeType: 'application/pdf',
            parseStatus: 'PENDING',
            parsedContent: null
          });
        })
      );
      
      console.log(`📤 Created ${testFiles.length} test files for concurrent parsing`);
      
      const startTime = Date.now();
      
      // Parse all files concurrently
      const parsingPromises = testFiles.map(async (file, index) => {
        const fileStartTime = Date.now();
        
        try {
          await triggerPdfParsing(
            file.id,
            file.fileKey,
            file.originalFileName,
            teacher.id
          );
          
          const fileProcessingTime = Date.now() - fileStartTime;
          
          return {
            fileIndex: index,
            fileName: file.originalFileName,
            success: true,
            processingTime: fileProcessingTime,
            error: null
          };
        } catch (error) {
          const fileProcessingTime = Date.now() - fileStartTime;
          
          return {
            fileIndex: index,
            fileName: file.originalFileName,
            success: false,
            processingTime: fileProcessingTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const results = await Promise.all(parsingPromises);
      const totalTime = Date.now() - startTime;
      
      // Analyze results
      const successfulFiles = results.filter(r => r.success);
      const failedFiles = results.filter(r => !r.success);
      const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      const maxProcessingTime = Math.max(...results.map(r => r.processingTime));
      const minProcessingTime = Math.min(...results.map(r => r.processingTime));
      
      console.log('\\n📊 Concurrent PDF Parsing Results:');
      console.log(`✅ Successfully parsed: ${successfulFiles.length}/${results.length} files`);
      console.log(`❌ Failed to parse: ${failedFiles.length} files`);
      console.log(`⏱️  Total concurrent processing time: ${totalTime}ms`);
      console.log(`📊 Average processing time per file: ${Math.round(averageProcessingTime)}ms`);
      console.log(`📊 Processing time range: ${minProcessingTime}ms - ${maxProcessingTime}ms`);
      
      // Log individual results
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.fileName}: ${result.processingTime}ms${result.error ? ` (${result.error})` : ''}`);
      });
      
      // Verify database states
      const updatedFiles = await db.uploadedFile.findMany({
        where: { 
          id: { in: testFiles.map(f => f.id) }
        }
      });
      
      const completedFiles = updatedFiles.filter(f => f.parseStatus === 'COMPLETED');
      const failedFilesInDb = updatedFiles.filter(f => f.parseStatus === 'FAILED');
      
      console.log(`\\n📊 Database verification:`);
      console.log(`📝 Files marked COMPLETED: ${completedFiles.length}`);
      console.log(`❌ Files marked FAILED: ${failedFilesInDb.length}`);
      
      // Assertions
      expect(results.length).toBe(5);
      expect(successfulFiles.length).toBeGreaterThanOrEqual(3); // At least 60% success rate
      expect(averageProcessingTime).toBeLessThan(180000); // Average under 3 minutes
      expect(totalTime).toBeLessThan(300000); // Total under 5 minutes for concurrent processing
      expect(completedFiles.length).toBe(successfulFiles.length);
      
      console.log('✅ Concurrent PDF parsing test completed');
    }, 400000); // 6.5 minute timeout for concurrent processing
    
    it.skipIf(skipReason)('should handle PDF parsing timeouts and failures gracefully', async () => {
      console.log('\\n⏰ Testing PDF Parsing Timeout Handling');
      
      const teacher = await UserFactory.createTeacher({
        name: 'Timeout Test Teacher',
        email: 'timeout.test@university.edu'
      });
      
      // Create a file that might cause timeout (very large content)
      const largeContent = createMinimalTestContent().repeat(100); // Repeat content 100 times
      
      const largeFile = await UploadedFileFactory.create({
        userId: teacher.id,
        originalFileName: 'large-timeout-test.pdf',
        fileName: 'large-timeout-test.pdf',
        fileSize: Buffer.byteLength(largeContent, 'utf8'),
        mimeType: 'application/pdf',
        parseStatus: 'PENDING',
        parsedContent: null
      });
      
      console.log(`📤 Created large test file: ${largeFile.originalFileName}`);
      console.log(`📊 File size: ${largeFile.fileSize} bytes (${Math.round(largeFile.fileSize / 1024)}KB)`);
      
      const startTime = Date.now();
      
      try {
        await triggerPdfParsing(
          largeFile.id,
          largeFile.fileKey,
          largeFile.originalFileName,
          teacher.id
        );
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Large file parsed successfully in ${processingTime}ms`);
        
        const updatedFile = await db.uploadedFile.findUnique({
          where: { id: largeFile.id }
        });
        
        expect(updatedFile?.parseStatus).toBe('COMPLETED');
        expect(updatedFile?.parsedContent).toBeTruthy();
        
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.log(`⏰ PDF parsing timed out or failed after ${processingTime}ms`);
        console.log(`📋 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        const failedFile = await db.uploadedFile.findUnique({
          where: { id: largeFile.id }
        });
        
        // Verify proper error handling
        expect(failedFile?.parseStatus).toBe('FAILED');
        expect(failedFile?.parseError).toBeTruthy();
        expect(processingTime).toBeGreaterThan(1000); // Should have tried for at least 1 second
        
        // This is acceptable behavior for timeout scenarios
        console.log('✅ Timeout handled gracefully');
      }
      
      console.log('✅ PDF parsing timeout test completed');
    }, 200000); // 3.5 minute timeout
  });
  
  describe('PDF Parser Service Load Testing', () => {
    it.skipIf(skipReason)('should validate PDF parser service availability and performance', async () => {
      console.log('\\n🌐 Testing PDF Parser Service Load');
      
      const teacher = await UserFactory.createTeacher();
      
      // Test multiple small files to check service load handling
      const batchSize = 3;
      const testFiles = await Promise.all(
        Array.from({ length: batchSize }, (_, i) => {
          const content = createMinimalTestContent() + `\\n\\nBatch test file ${i + 1}.`;
          
          return UploadedFileFactory.create({
            userId: teacher.id,
            originalFileName: `load-test-${i + 1}.pdf`,
            fileName: `load-test-${i + 1}.pdf`,
            fileSize: Buffer.byteLength(content, 'utf8'),
            mimeType: 'application/pdf',
            parseStatus: 'PENDING'
          });
        })
      );
      
      console.log(`📤 Testing PDF parser service with ${batchSize} files`);
      
      const serviceStartTime = Date.now();
      let successCount = 0;
      let failureCount = 0;
      const processingTimes: number[] = [];
      
      // Process files sequentially to avoid overwhelming the service
      for (const [index, file] of testFiles.entries()) {
        const fileStartTime = Date.now();
        
        try {
          console.log(`🔄 Processing file ${index + 1}/${batchSize}: ${file.originalFileName}`);
          
          await triggerPdfParsing(
            file.id,
            file.fileKey,
            file.originalFileName,
            teacher.id
          );
          
          const fileProcessingTime = Date.now() - fileStartTime;
          processingTimes.push(fileProcessingTime);
          successCount++;
          
          console.log(`   ✅ Completed in ${fileProcessingTime}ms`);
          
          // Small delay between files to be respectful to the service
          if (index < testFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          const fileProcessingTime = Date.now() - fileStartTime;
          processingTimes.push(fileProcessingTime);
          failureCount++;
          
          console.log(`   ❌ Failed in ${fileProcessingTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      const totalServiceTime = Date.now() - serviceStartTime;
      const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      
      console.log('\\n📊 PDF Parser Service Load Results:');
      console.log(`✅ Successful parses: ${successCount}/${testFiles.length}`);
      console.log(`❌ Failed parses: ${failureCount}/${testFiles.length}`);
      console.log(`⏱️  Total test time: ${totalServiceTime}ms`);
      console.log(`📊 Average processing time: ${Math.round(averageProcessingTime)}ms`);
      console.log(`📊 Processing times: ${processingTimes.map(t => Math.round(t)).join(', ')}ms`);
      
      // Service health assertions
      expect(successCount).toBeGreaterThan(0); // At least one should succeed
      expect(averageProcessingTime).toBeLessThan(120000); // Average under 2 minutes
      expect(processingTimes.every(t => t < 180000)).toBe(true); // All under 3 minutes
      
      console.log('✅ PDF parser service load test completed');
    }, 600000); // 10 minute timeout for service load test
  });
});