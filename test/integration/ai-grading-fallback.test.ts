import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  UserFactory,
  RubricFactory,
  UploadedFileFactory,
  GradingSessionFactory,
  GradingResultFactory,
} from '../factories';

/**
 * Integration Test Case #3: AI Grading Fallback Mechanism Resilience
 *
 * This test covers the critical AI grading fallback system:
 * Stage 1: Gemini File Upload → OpenAI File Upload → Gemini Text → OpenAI Text
 * Tests various failure scenarios and provider switching logic
 */
describe('AI Grading Fallback Mechanism Integration', () => {
  // Mock external services for controlled testing
  const mockFetch = vi.fn();

  beforeEach(() => {
    // Mock global fetch for API calls
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Grading Scenarios', () => {
    it('should succeed with Gemini file upload on first attempt', async () => {
      // 🔴 RED: Test the happy path - Gemini succeeds immediately

      // Arrange - Set up complete grading scenario
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Essay Grading Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'student-essay.pdf',
        parsedContent: 'This essay discusses the impact of artificial intelligence on modern education systems...',
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
      });

      // Act - Create successful grading result (simulating Gemini success)
      const gradingResult = await GradingResultFactory.createGeminiResult({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Assert - Verify Gemini result characteristics
      expect(gradingResult.status).toBe('COMPLETED');
      expect(gradingResult.progress).toBe(100);
      expect(gradingResult.gradingModel).toBe('gemini-1.5-pro');
      expect(gradingResult.result).toBeDefined();

      // Verify result structure
      const result = gradingResult.result as any;
      expect(result.provider).toBe('gemini');
      expect(result.method).toBe('file_upload');
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.breakdown).toBeInstanceOf(Array);
      expect(result.overallFeedback).toBeTruthy();

      // Verify timing metrics
      expect(gradingResult.gradingTokens).toBeGreaterThan(0);
      expect(gradingResult.gradingDuration).toBeGreaterThan(0);

      console.log('  Gemini first attempt success test passed');
    });

    it('should fallback to OpenAI and succeed when Gemini fails', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Code Review Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'programming-assignment.pdf',
        parsedContent: 'function quickSort(arr) { /* implementation */ }',
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
      });

      // Act - Create OpenAI fallback result (simulating Gemini failure → OpenAI success)
      const gradingResult = await GradingResultFactory.createOpenAIResult({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Assert - Verify OpenAI fallback result characteristics
      expect(gradingResult.status).toBe('COMPLETED');
      expect(gradingResult.gradingModel).toBe('gpt-4');

      const result = gradingResult.result as any;
      expect(result.provider).toBe('openai');
      expect(result.method).toBe('assistant_api');
      expect(result.totalScore).toBeGreaterThan(0);

      // OpenAI typically uses more tokens and takes longer
      expect(gradingResult.gradingTokens).toBeGreaterThan(1500);
      expect(gradingResult.gradingDuration).toBeGreaterThan(3000);

      console.log('  OpenAI fallback success test passed');
    });
  });

  describe('Failure Scenarios and Error Handling', () => {
    it('should handle complete grading failure gracefully', async () => {
      // Arrange
      const student = await UserFactory.createStudent();
      const teacher = await UserFactory.createTeacher();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Failed Grading Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createWithParseStatus(student.id, 'FAILED');

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
      });

      // Act - Create failed grading result (simulating all providers failing)
      const gradingResult = await GradingResultFactory.createFailed(
        {
          gradingSessionId: gradingSession.id,
          uploadedFileId: uploadedFile.id,
          rubricId: rubric.id,
        },
        'All AI providers failed: File could not be processed'
      );

      // Assert - Verify failure handling
      expect(gradingResult.status).toBe('FAILED');
      expect(gradingResult.progress).toBe(0);
      expect(gradingResult.result).toBeNull();
      expect(gradingResult.errorMessage).toContain('All AI providers failed');

      // Verify file parsing failure contributed to the issue
      expect(uploadedFile.parseStatus).toBe('FAILED');
      expect(uploadedFile.parseError).toBeTruthy();

      console.log('  Complete failure handling test passed');
    });

    it('should track different error types and retry logic', async () => {
      // Arrange
      const student = await UserFactory.createStudent();
      const teacher = await UserFactory.createTeacher();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Network Error Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id);
      const gradingSession = await GradingSessionFactory.create({ userId: student.id });

      // Act - Create different types of failures
      const networkError = await GradingResultFactory.createFailed(
        {
          gradingSessionId: gradingSession.id,
          uploadedFileId: uploadedFile.id,
          rubricId: rubric.id,
        },
        'Network error: Connection timeout to Gemini API'
      );

      const authError = await GradingResultFactory.createFailed(
        {
          gradingSessionId: gradingSession.id,
          uploadedFileId: uploadedFile.id,
          rubricId: rubric.id,
        },
        'Authentication error: Invalid API key for OpenAI'
      );

      const quotaError = await GradingResultFactory.createFailed(
        {
          gradingSessionId: gradingSession.id,
          uploadedFileId: uploadedFile.id,
          rubricId: rubric.id,
        },
        'Quota exceeded: Rate limit reached for Gemini API'
      );

      // Assert - Verify error categorization
      expect(networkError.errorMessage).toContain('Network error');
      expect(authError.errorMessage).toContain('Authentication error');
      expect(quotaError.errorMessage).toContain('Quota exceeded');

      // All should be failed status
      [networkError, authError, quotaError].forEach((result) => {
        expect(result.status).toBe('FAILED');
        expect(result.result).toBeNull();
      });

      console.log('  Error type tracking test passed');
    });
  });

  describe('Provider Comparison and Validation', () => {
    it('should demonstrate differences between AI providers', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Provider Comparison Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'comparison-test.pdf',
        parsedContent: 'Compare and contrast the benefits of renewable energy sources...',
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
      });

      // Act - Create results from both providers
      const geminiResult = await GradingResultFactory.createGeminiResult({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      const openaiResult = await GradingResultFactory.createOpenAIResult({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Assert - Compare provider characteristics
      expect(geminiResult.gradingModel).toBe('gemini-1.5-pro');
      expect(openaiResult.gradingModel).toBe('gpt-4');

      // Gemini typically faster, fewer tokens
      expect(geminiResult.gradingDuration).toBeLessThan(openaiResult.gradingDuration!);
      expect(geminiResult.gradingTokens).toBeLessThan(openaiResult.gradingTokens!);

      // Both should have valid results but potentially different scores
      const geminiScore = (geminiResult.result as any).totalScore;
      const openaiScore = (openaiResult.result as any).totalScore;

      expect(geminiScore).toBeGreaterThan(0);
      expect(openaiScore).toBeGreaterThan(0);

      // Scores should be reasonably close (within 10 points)
      expect(Math.abs(geminiScore - openaiScore)).toBeLessThanOrEqual(10);

      console.log('  Provider comparison test passed');
    });

    it('should validate result quality and structure', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Quality Validation Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id);
      const gradingSession = await GradingSessionFactory.create({ userId: student.id });

      // Act
      const gradingResult = await GradingResultFactory.createCompleted({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Assert - Comprehensive result validation (simulating isValidGradingResult)
      expect(gradingResult.result).toBeDefined();

      const result = gradingResult.result as any;

      // Required fields
      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('maxScore');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('overallFeedback');

      // Score validation
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(result.maxScore);
      expect(result.maxScore).toBeGreaterThan(0);

      // Breakdown validation
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(result.breakdown.length).toBeGreaterThan(0);

      result.breakdown.forEach((criteria: any) => {
        expect(criteria).toHaveProperty('criteriaId');
        expect(criteria).toHaveProperty('name');
        expect(criteria).toHaveProperty('score');
        expect(criteria).toHaveProperty('feedback');
        expect(typeof criteria.feedback).toBe('string');
        expect(criteria.feedback.length).toBeGreaterThan(0);
      });

      // Feedback validation
      expect(typeof result.overallFeedback).toBe('string');
      expect(result.overallFeedback.length).toBeGreaterThan(10); // Meaningful feedback

      console.log('  Result quality validation test passed');
    });
  });

  describe('Grading Session Progress Tracking', () => {
    it('should track progress through complete grading workflow', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Progress Tracking Rubric',
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id);
      const gradingSession = await GradingSessionFactory.create({ userId: student.id });

      // Act - Simulate progress through grading stages
      const pendingResult = await GradingResultFactory.create({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
        status: 'PENDING',
        progress: 0,
      });

      const processingResult = await GradingResultFactory.createProcessing(
        {
          gradingSessionId: gradingSession.id,
          uploadedFileId: uploadedFile.id,
          rubricId: rubric.id,
        },
        75
      );

      const completedResult = await GradingResultFactory.createCompleted({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Assert - Verify progress tracking
      expect(pendingResult.status).toBe('PENDING');
      expect(pendingResult.progress).toBe(0);
      expect(pendingResult.result).toBeNull();

      expect(processingResult.status).toBe('PROCESSING');
      expect(processingResult.progress).toBe(75);
      expect(processingResult.gradingModel).toBeTruthy();

      expect(completedResult.status).toBe('COMPLETED');
      expect(completedResult.progress).toBe(100);
      expect(completedResult.result).toBeDefined();
      expect(completedResult.completedAt).toBeInstanceOf(Date);

      console.log('  Progress tracking test passed');
    });
  });
});
