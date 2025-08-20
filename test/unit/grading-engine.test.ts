import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

// Mock all external dependencies BEFORE importing the service
vi.mock('@/types/database', () => ({
  db: {
    gradingResult: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('@/services/grading-result.server', () => ({
  updateGradingResult: vi.fn(),
  failGradingResult: vi.fn(),
  startGradingResult: vi.fn(),
  updateGradingProgress: vi.fn()
}));

vi.mock('@/services/grading-session.server', () => ({
  updateGradingSessionProgress: vi.fn()
}));

vi.mock('@/services/gemini.server', () => ({
  getGeminiService: vi.fn()
}));

vi.mock('@/services/openai.server', () => ({
  getOpenAIService: vi.fn()
}));

vi.mock('@/services/storage.server', () => ({
  getFileFromStorage: vi.fn()
}));

vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Import the mocked modules and service AFTER mocking
import { db } from '@/types/database';
import { getGeminiService } from '@/services/gemini.server';
import { getFileFromStorage } from '@/services/storage.server';

// Import the service being tested
import { processGradingResult } from '@/services/grading-engine.server';

/**
 * Unit Test #3: Grading Engine Logic
 * 
 * Tests the core grading engine workflow that orchestrates AI grading,
 * handles provider fallbacks, and manages database updates.
 */
describe('Grading Engine Logic', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Core Grading Workflow', () => {
    it('should process grading result successfully', async () => {
      console.log('\\n🤖 Testing Successful Grading Workflow');
      
      // Mock grading result with all required data
      const mockGradingResult = {
        id: 'result123',
        status: 'PENDING',
        uploadedFile: {
          id: 'file123',
          fileName: 'student-essay.pdf',
          originalFileName: 'student-essay.pdf',
          fileKey: 'uploads/student/essay.pdf',
          parsedContent: '這是學生的作業內容，包含了對主題的分析。',
          mimeType: 'application/pdf'
        },
        rubric: {
          id: 'rubric123',
          name: '論文評分標準',
          criteria: [
            {
              id: 'content-quality',
              name: '內容品質',
              description: '分析深度和廣度',
              maxScore: 40
            },
            {
              id: 'writing-clarity',
              name: '寫作清晰度',
              description: '表達的清楚程度',
              maxScore: 30
            }
          ]
        },
        gradingSession: {
          id: 'session123',
          name: '期中考試評分'
        }
      };
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(mockGradingResult);
      
      // Mock successful Gemini service
      const mockGeminiService = {
        gradeDocumentWithFile: vi.fn().mockResolvedValue({
          success: true,
          result: {
            totalScore: 60,
            maxScore: 70,
            breakdown: [
              {
                criteriaId: 'content-quality',
                score: 35,
                feedback: '內容分析深入，引用適當'
              },
              {
                criteriaId: 'writing-clarity',
                score: 25,
                feedback: '表達清晰，結構完整'
              }
            ]
          },
          metadata: { model: 'gemini-2.0-flash', tokens: 1500 }
        })
      };
      
      (getGeminiService as Mock).mockReturnValue(mockGeminiService);
      (getFileFromStorage as Mock).mockResolvedValue(Buffer.from('file content'));
      
      // Mock database updates
      (db.gradingResult.update as Mock).mockResolvedValue({});
      
      const result = await processGradingResult('result123', 'user123', 'session123');
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Verify data fetching
      expect(db.gradingResult.findUnique).toHaveBeenCalledWith({
        where: { id: 'result123' },
        include: {
          uploadedFile: true,
          rubric: true,
          gradingSession: true
        }
      });
      
      // Verify file retrieval
      expect(getFileFromStorage).toHaveBeenCalledWith('uploads/student/essay.pdf');
      
      // Verify AI service call
      expect(getGeminiService).toHaveBeenCalled();
      expect(mockGeminiService.gradeDocumentWithFile).toHaveBeenCalledWith({
        fileBuffer: expect.any(Buffer),
        mimeType: 'application/pdf',
        fileName: 'student-essay.pdf',
        rubricName: '論文評分標準',
        criteria: mockGradingResult.rubric.criteria
      });
      
      // Verify database updates (status changes and final result)
      expect(db.gradingResult.update).toHaveBeenCalledWith({
        where: { id: 'result123' },
        data: {
          status: 'PROCESSING',
          progress: 10
        }
      });
      
      expect(db.gradingResult.update).toHaveBeenCalledWith({
        where: { id: 'result123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          progress: 100,
          result: expect.objectContaining({
            totalScore: 60,
            maxScore: 70
          }),
          gradingModel: 'gemini-2.0-flash',
          gradingTokens: 1500
        })
      });
      
      console.log('✅ Grading workflow completed successfully');
    });
    
    it('should handle missing grading result', async () => {
      console.log('\\n❌ Testing Missing Grading Result');
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(null);
      
      const result = await processGradingResult('nonexistent', 'user123', 'session123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Grading result not found');
      
      console.log('✅ Missing grading result handled correctly');
    });
    
    it('should skip processing if result is not pending', async () => {
      console.log('\\n⏭️ Testing Non-Pending Status Skip');
      
      const mockCompletedResult = {
        id: 'result123',
        status: 'COMPLETED', // Not PENDING
        uploadedFile: { id: 'file123' },
        rubric: { id: 'rubric123' }
      };
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(mockCompletedResult);
      
      const result = await processGradingResult('result123', 'user123', 'session123');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Should not call AI service for non-pending results
      expect(getGeminiService).not.toHaveBeenCalled();
      
      console.log('✅ Non-pending result skipped appropriately');
    });
    
    it('should handle missing required data', async () => {
      console.log('\\n📋 Testing Missing Required Data');
      
      const testCases = [
        {
          name: 'missing file',
          result: {
            id: 'result123',
            status: 'PENDING',
            uploadedFile: null,
            rubric: { id: 'rubric123' }
          }
        },
        {
          name: 'missing rubric',
          result: {
            id: 'result123',
            status: 'PENDING',
            uploadedFile: { id: 'file123' },
            rubric: null
          }
        }
      ];
      
      for (const testCase of testCases) {
        vi.clearAllMocks();
        (db.gradingResult.findUnique as Mock).mockResolvedValue(testCase.result);
        
        const result = await processGradingResult('result123', 'user123', 'session123');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing file or rubric data');
        
        console.log(`✅ ${testCase.name} validation passed`);
      }
    });
    
    it('should handle unparsed file content', async () => {
      console.log('\\n📄 Testing Unparsed File Content');
      
      const mockResultWithUnparsedFile = {
        id: 'result123',
        status: 'PENDING',
        uploadedFile: {
          id: 'file123',
          parsedContent: null, // No parsed content
          fileName: 'test.pdf'
        },
        rubric: { id: 'rubric123' }
      };
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(mockResultWithUnparsedFile);
      
      const result = await processGradingResult('result123', 'user123', 'session123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File has no parsed content');
      
      // Note: The actual implementation updates database directly, not through failGradingResult
      console.log('✅ Unparsed file content handled correctly');
    });
  });
  
  describe('Database Operations and Error Handling', () => {
    it('should handle database connection failures', async () => {
      console.log('\\n💥 Testing Database Connection Failures');
      
      // Mock findUnique to throw an unexpected exception
      (db.gradingResult.findUnique as Mock).mockRejectedValue(new Error('Database timeout'));
      
      const result = await processGradingResult('result123', 'user123', 'session123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database timeout');
      
      console.log('✅ Database connection failures handled correctly');
    });
    
    it('should handle missing rubric criteria', async () => {
      console.log('\\n📋 Testing Missing Rubric Criteria');
      
      const mockResultWithNoCriteria = {
        id: 'result123',
        status: 'PENDING',
        uploadedFile: {
          id: 'file123',
          fileName: 'test.pdf',
          originalFileName: 'test.pdf',
          parsedContent: 'Test content',
          mimeType: 'application/pdf'
        },
        rubric: {
          id: 'rubric123',
          name: 'Empty Rubric',
          criteria: [] // No criteria
        },
        gradingSession: { id: 'session123' }
      };
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(mockResultWithNoCriteria);
      (db.gradingResult.update as Mock).mockResolvedValue({});
      
      const result = await processGradingResult('result123', 'user123', 'session123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No grading criteria found in rubric');
      
      // Verify database was updated with failure
      expect(db.gradingResult.update).toHaveBeenCalledWith({
        where: { id: 'result123' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'No grading criteria found in rubric'
        })
      });
      
      console.log('✅ Missing rubric criteria handled correctly');
    });
    
    it('should track progress through database updates', async () => {
      console.log('\\n📊 Testing Database Progress Updates');
      
      const mockGradingResult = {
        id: 'result123',
        status: 'PENDING',
        uploadedFile: {
          id: 'file123',
          fileName: 'test.pdf',
          originalFileName: 'test.pdf',
          fileKey: 'uploads/test.pdf',
          parsedContent: 'Test content',
          mimeType: 'application/pdf'
        },
        rubric: {
          id: 'rubric123',
          name: 'Test Rubric',
          criteria: [{ id: 'test', name: 'Test', maxScore: 10 }]
        },
        gradingSession: { id: 'session123' }
      };
      
      (db.gradingResult.findUnique as Mock).mockResolvedValue(mockGradingResult);
      
      const mockGeminiService = {
        gradeDocumentWithFile: vi.fn().mockResolvedValue({
          success: true,
          result: {
            totalScore: 9,
            maxScore: 10,
            breakdown: [{ criteriaId: 'test', score: 9, feedback: 'Excellent work' }]
          },
          metadata: { model: 'gemini-2.0-flash', tokens: 1200 }
        })
      };
      
      (getGeminiService as Mock).mockReturnValue(mockGeminiService);
      (getFileFromStorage as Mock).mockResolvedValue(Buffer.from('file content'));
      (db.gradingResult.update as Mock).mockResolvedValue({});
      
      await processGradingResult('result123', 'user123', 'session123');
      
      // Verify progress updates in database
      const updateCalls = (db.gradingResult.update as Mock).mock.calls;
      
      // Initial processing state
      expect(updateCalls).toContainEqual([{
        where: { id: 'result123' },
        data: { status: 'PROCESSING', progress: 10 }
      }]);
      
      // Progress update
      expect(updateCalls).toContainEqual([{
        where: { id: 'result123' },
        data: { progress: 30 }
      }]);
      
      // Progress update before completion
      expect(updateCalls).toContainEqual([{
        where: { id: 'result123' },
        data: { progress: 80 }
      }]);
      
      // Final completion
      expect(updateCalls.some(call => 
        call[0].data.status === 'COMPLETED' && 
        call[0].data.progress === 100
      )).toBe(true);
      
      console.log('✅ Database progress tracking verified');
    });
  });
});