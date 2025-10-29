import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  UserFactory,
  RubricFactory,
  UploadedFileFactory,
  GradingSessionFactory,
  GradingResultFactory,
} from '../factories';
import { db } from '@/types/database';

/**
 * Grading Engine Validation Test
 *
 * This test focuses on the data validation and workflow logic
 * of the grading engine without relying on external AI service calls.
 * Tests database operations, error handling, and business logic validation.
 */
describe('Grading Engine Validation Tests', () => {
  describe('Data Validation and Error Handling', () => {
    it('should detect missing file content and fail gracefully', async () => {
      // Arrange - Create scenario with missing parsed content
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Test',
        email: 'prof.test@university.edu',
      });

      const student = await UserFactory.createStudent({
        name: 'Test Student',
        email: 'test.student@university.edu',
      });

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Test Rubric',
        criteria: [
          {
            id: uuidv4(),
            name: 'Content Quality',
            description: 'Quality of content',
            maxScore: 50,
            levels: [
              { score: 50, description: 'Excellent' },
              { score: 25, description: 'Good' },
              { score: 0, description: 'Poor' },
            ],
          },
        ],
      });

      // Create file with no parsed content
      const uploadedFile = await UploadedFileFactory.create({
        userId: student.id,
        originalFileName: 'empty-file.pdf',
        parsedContent: null, // No parsed content
        parseStatus: 'FAILED',
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
        status: 'PENDING',
      });

      const gradingResult = await GradingResultFactory.create({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
        status: 'PENDING',
        progress: 0,
      });

      // Act - Try to process the result (this should fail due to missing content)
      const { processGradingResult } = await import('@/services/grading-engine.server');
      const result = await processGradingResult(gradingResult.id, student.id, gradingSession.id);

      // Assert - Should fail with appropriate error
      expect(result.success).toBe(false);
      expect(result.error).toContain('no parsed content');

      // Verify database state
      const updatedResult = await db.gradingResult.findUnique({
        where: { id: gradingResult.id },
      });

      expect(updatedResult).toBeTruthy();
      expect(updatedResult!.status).toBe('PENDING'); // Should remain pending when content is missing

      console.log('✅ Missing content validation test passed');
    });

    it('should detect empty rubric criteria and fail appropriately', async () => {
      // Arrange - Create scenario with empty rubric
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();

      // Create rubric with empty criteria
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Empty Rubric',
        criteria: [], // Empty criteria array
      });

      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'test-essay.pdf',
        parsedContent: 'This is a test essay with some content.',
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: student.id,
      });

      const gradingResult = await GradingResultFactory.create({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
        status: 'PENDING',
      });

      // Act
      const { processGradingResult } = await import('@/services/grading-engine.server');
      const result = await processGradingResult(gradingResult.id, student.id, gradingSession.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No grading criteria found');

      // Verify database state shows failure
      const updatedResult = await db.gradingResult.findUnique({
        where: { id: gradingResult.id },
      });

      expect(updatedResult!.status).toBe('FAILED');
      expect(updatedResult!.errorMessage).toContain('No grading criteria found');

      console.log('✅ Empty rubric validation test passed');
    });

    it('should properly validate rubric criteria structure', async () => {
      // Arrange - Test different rubric structures
      const teacher = await UserFactory.createTeacher();

      // Test standard criteria format
      const standardRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Standard Rubric',
        criteria: [
          {
            id: uuidv4(),
            name: 'Content Quality',
            description: 'Quality and depth of content',
            maxScore: 40,
            levels: [
              { score: 40, description: 'Excellent analysis' },
              { score: 30, description: 'Good analysis' },
              { score: 20, description: 'Fair analysis' },
              { score: 0, description: 'Poor analysis' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Organization',
            description: 'Structure and flow',
            maxScore: 30,
            levels: [
              { score: 30, description: 'Well organized' },
              { score: 20, description: 'Generally organized' },
              { score: 10, description: 'Some organization' },
              { score: 0, description: 'Poorly organized' },
            ],
          },
        ],
      });

      // Test categorized criteria format
      const categorizedRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Categorized Rubric',
        criteria: [
          {
            id: uuidv4(),
            name: 'Content Analysis',
            description: 'Content-related criteria',
            criteria: [
              {
                id: uuidv4(),
                name: 'Thesis Statement',
                description: 'Quality of thesis',
                maxScore: 25,
                levels: [
                  { score: 25, description: 'Clear thesis' },
                  { score: 15, description: 'Adequate thesis' },
                  { score: 0, description: 'Unclear thesis' },
                ],
              },
            ],
          },
          {
            id: uuidv4(),
            name: 'Structure & Style',
            description: 'Structural criteria',
            criteria: [
              {
                id: uuidv4(),
                name: 'Organization',
                description: 'Essay structure',
                maxScore: 25,
                levels: [
                  { score: 25, description: 'Well structured' },
                  { score: 15, description: 'Adequately structured' },
                  { score: 0, description: 'Poorly structured' },
                ],
              },
            ],
          },
        ],
      });

      // Assert - Verify rubric creation was successful
      expect(standardRubric).toBeTruthy();
      expect(standardRubric.criteria).toHaveLength(2);
      expect(categorizedRubric).toBeTruthy();
      expect(categorizedRubric.criteria).toHaveLength(2);

      // Verify that both formats have expected structure
      const standardCriteria = Array.isArray(standardRubric.criteria) ? standardRubric.criteria : [];
      expect(standardCriteria[0]).toHaveProperty('id');
      expect(standardCriteria[0]).toHaveProperty('name');
      expect(standardCriteria[0]).toHaveProperty('maxScore');

      const categorizedCriteria = Array.isArray(categorizedRubric.criteria) ? categorizedRubric.criteria : [];
      expect(categorizedCriteria[0]).toHaveProperty('criteria');
      const firstCategory = categorizedCriteria[0] as any;
      expect(Array.isArray(firstCategory.criteria)).toBe(true);

      console.log('✅ Rubric structure validation test passed');
    });

    it('should handle grading result not found scenario', async () => {
      // Act - Try to process non-existent grading result
      const { processGradingResult } = await import('@/services/grading-engine.server');
      const result = await processGradingResult('non-existent-id', 'non-existent-user-id', 'non-existent-session-id');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Grading result not found');

      console.log('✅ Non-existent result handling test passed');
    });

    it('should skip processing for already completed results', async () => {
      // Arrange - Create already completed result
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();
      const rubric = await RubricFactory.create({ userId: teacher.id });
      const uploadedFile = await UploadedFileFactory.createPdf(student.id);
      const gradingSession = await GradingSessionFactory.create({ userId: student.id });

      const completedResult = await GradingResultFactory.createCompleted({
        gradingSessionId: gradingSession.id,
        uploadedFileId: uploadedFile.id,
        rubricId: rubric.id,
      });

      // Act - Try to process already completed result
      const { processGradingResult } = await import('@/services/grading-engine.server');
      const result = await processGradingResult(completedResult.id, student.id, gradingSession.id);

      // Assert - Should succeed but do nothing
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify status remains unchanged
      const unchangedResult = await db.gradingResult.findUnique({
        where: { id: completedResult.id },
      });

      expect(unchangedResult!.status).toBe('COMPLETED');

      console.log('✅ Already completed result handling test passed');
    });

    it('should validate complete grading workflow data integrity', async () => {
      // Arrange - Create complete realistic scenario
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Williams',
        email: 'prof.williams@university.edu',
      });

      const students = await UserFactory.createMany(2, { role: 'STUDENT' });

      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Essay Evaluation Rubric',
        criteria: [
          {
            id: uuidv4(),
            name: 'Content & Analysis',
            description: 'Quality of content and analytical thinking',
            maxScore: 50,
            levels: [
              { score: 50, description: 'Exceptional analysis with original insights' },
              { score: 40, description: 'Strong analysis with good insights' },
              { score: 30, description: 'Adequate analysis' },
              { score: 20, description: 'Basic analysis' },
              { score: 0, description: 'No meaningful analysis' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Writing Quality',
            description: 'Grammar, style, and clarity',
            maxScore: 30,
            levels: [
              { score: 30, description: 'Excellent writing' },
              { score: 25, description: 'Good writing' },
              { score: 20, description: 'Adequate writing' },
              { score: 15, description: 'Poor writing' },
              { score: 0, description: 'Very poor writing' },
            ],
          },
        ],
      });

      const gradingSession = await GradingSessionFactory.create({
        userId: teacher.id,
        status: 'PENDING',
      });

      // Create multiple files and results
      const files = await Promise.all(
        students.map((student, index) =>
          UploadedFileFactory.createPdf(student.id, {
            originalFileName: `essay-${index + 1}.pdf`,
            parsedContent: `This is essay content for student ${index + 1}. It contains substantial academic analysis and demonstrates understanding of the topic. The writing shows clear organization and thoughtful argumentation.`,
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
            progress: 0,
          })
        )
      );

      // Assert - Verify all relationships and data integrity
      expect(teacher.role).toBe('TEACHER');
      expect(students.every((s) => s.role === 'STUDENT')).toBe(true);
      expect(rubric.userId).toBe(teacher.id);
      expect(rubric.criteria).toHaveLength(2);
      expect(files).toHaveLength(2);
      expect(gradingResults).toHaveLength(2);

      // Verify database relationships
      const sessionWithResults = await db.gradingSession.findUnique({
        where: { id: gradingSession.id },
        include: {
          gradingResults: {
            include: {
              uploadedFile: true,
              rubric: true,
            },
          },
        },
      });

      expect(sessionWithResults).toBeTruthy();
      expect(sessionWithResults!.gradingResults).toHaveLength(2);
      expect(sessionWithResults!.gradingResults.every((r) => r.rubric.id === rubric.id)).toBe(true);
      expect(sessionWithResults!.gradingResults.every((r) => r.uploadedFile.parsedContent !== null)).toBe(true);

      console.log('✅ Complete workflow data integrity test passed');
      console.log(`   • Created ${students.length} students and ${files.length} files`);
      console.log(`   • Session contains ${sessionWithResults!.gradingResults.length} results`);
      console.log(`   • All results have valid file content and rubric relationships`);
    });
  });
});
