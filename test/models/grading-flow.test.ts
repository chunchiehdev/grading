import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase, setupTestDatabase } from '../database';
import { 
  UserFactory, 
  RubricFactory, 
  UploadedFileFactory, 
  GradingSessionFactory, 
  GradingResultFactory 
} from '../factories';
import { db, GradingSessionStatus, GradingStatus, FileParseStatus } from '@/types/database';

describe('Grading Flow Integration Tests', () => {
  let userFactory: UserFactory;
  let rubricFactory: RubricFactory;
  let uploadedFileFactory: UploadedFileFactory;
  let gradingSessionFactory: GradingSessionFactory;
  let gradingResultFactory: GradingResultFactory;

  beforeEach(async () => {
    await resetDatabase();
    
    userFactory = new UserFactory(db);
    rubricFactory = new RubricFactory(db);
    uploadedFileFactory = new UploadedFileFactory(db);
    gradingSessionFactory = new GradingSessionFactory(db);
    gradingResultFactory = new GradingResultFactory(db);
  });

  describe('Complete Grading Workflow', () => {
    it('should create a complete grading session with multiple files and rubrics', async () => {
      // 1. Create user
      const user = await userFactory.create({ email: 'test@example.com' });

      // 2. Create rubrics
      const rubric1 = await rubricFactory.create({
        userId: user.id,
        name: 'Essay Grading Rubric',
        description: 'For grading essays',
      });

      const rubric2 = await rubricFactory.create({
        userId: user.id,
        name: 'Code Review Rubric',
        description: 'For grading programming assignments',
      });

      // 3. Upload files
      const file1 = await uploadedFileFactory.createPdfFile(user.id);
      const file2 = await uploadedFileFactory.createWordFile(user.id);

      // 4. Create grading session
      const session = await gradingSessionFactory.create({
        userId: user.id,
        status: GradingSessionStatus.PENDING,
      });

      // 5. Create grading results for each file-rubric pair
      const result1 = await gradingResultFactory.createCompleted({
        gradingSessionId: session.id,
        uploadedFileId: file1.id,
        rubricId: rubric1.id,
      });

      const result2 = await gradingResultFactory.createCompleted({
        gradingSessionId: session.id,
        uploadedFileId: file2.id,
        rubricId: rubric2.id,
      });

      // 6. Verify the complete workflow
      const sessionWithResults = await db.gradingSession.findUnique({
        where: { id: session.id },
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
      expect(sessionWithResults!.gradingResults[0].status).toBe(GradingStatus.COMPLETED);
      expect(sessionWithResults!.gradingResults[1].status).toBe(GradingStatus.COMPLETED);
    });

    it('should handle version control for rubrics', async () => {
      const user = await userFactory.create();

      // Create multiple versions of the same rubric
      const versions = await rubricFactory.createWithVersions(user.id, {
        name: 'Essay Rubric',
        description: 'Evolving essay rubric',
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[0].isActive).toBe(false);
      expect(versions[1].version).toBe(2);
      expect(versions[1].isActive).toBe(true);

      // Only active version should be returned in normal queries
      const activeRubrics = await db.rubric.findMany({
        where: { userId: user.id, isActive: true },
      });

      expect(activeRubrics).toHaveLength(1);
      expect(activeRubrics[0].version).toBe(2);
    });

    it('should track file parsing status correctly', async () => {
      const user = await userFactory.create();

      // Create files with different parse status
      const pendingFile = await uploadedFileFactory.createWithParseStatus(
        user.id, 
        FileParseStatus.PENDING
      );
      const completedFile = await uploadedFileFactory.createWithParseStatus(
        user.id, 
        FileParseStatus.COMPLETED
      );
      const failedFile = await uploadedFileFactory.createWithParseStatus(
        user.id, 
        FileParseStatus.FAILED
      );

      expect(pendingFile.parseStatus).toBe(FileParseStatus.PENDING);
      expect(pendingFile.parsedContent).toBeNull();

      expect(completedFile.parseStatus).toBe(FileParseStatus.COMPLETED);
      expect(completedFile.parsedContent).toBeTruthy();

      expect(failedFile.parseStatus).toBe(FileParseStatus.FAILED);
      expect(failedFile.parseError).toBeTruthy();
    });

    it('should enforce referential integrity', async () => {
      const user = await userFactory.create();
      const rubric = await rubricFactory.create({ userId: user.id });
      const file = await uploadedFileFactory.create({ userId: user.id });
      const session = await gradingSessionFactory.create({ userId: user.id });

      // Create grading result
      const result = await gradingResultFactory.create({
        gradingSessionId: session.id,
        uploadedFileId: file.id,
        rubricId: rubric.id,
      });

      // Try to delete rubric that's being used (should be restricted)
      await expect(
        db.rubric.delete({ where: { id: rubric.id } })
      ).rejects.toThrow();

      // Delete grading result first, then rubric should be deletable
      await db.gradingResult.delete({ where: { id: result.id } });
      await expect(
        db.rubric.delete({ where: { id: rubric.id } })
      ).resolves.toBeTruthy();
    });

    it('should calculate session progress correctly', async () => {
      const user = await userFactory.create();
      const rubric = await rubricFactory.create({ userId: user.id });
      const session = await gradingSessionFactory.create({ userId: user.id });

      // Create multiple files
      const files = await uploadedFileFactory.createMany(3, user.id);

      // Create grading results in different states
      await gradingResultFactory.createCompleted({
        gradingSessionId: session.id,
        uploadedFileId: files[0].id,
        rubricId: rubric.id,
      });

      await gradingResultFactory.createProcessing({
        gradingSessionId: session.id,
        uploadedFileId: files[1].id,
        rubricId: rubric.id,
      });

      await gradingResultFactory.createPending({
        gradingSessionId: session.id,
        uploadedFileId: files[2].id,
        rubricId: rubric.id,
      });

      // Check the results
      const results = await db.gradingResult.findMany({
        where: { gradingSessionId: session.id },
      });

      const completedCount = results.filter(r => r.status === GradingStatus.COMPLETED).length;
      const overallProgress = Math.round((completedCount / results.length) * 100);

      expect(overallProgress).toBe(33); // 1 out of 3 completed = 33%
    });
  });

  describe('Data Relationships', () => {
    it('should maintain proper foreign key relationships', async () => {
      const user = await userFactory.create();
      const rubric = await rubricFactory.create({ userId: user.id });
      const file = await uploadedFileFactory.create({ userId: user.id });
      const session = await gradingSessionFactory.create({ userId: user.id });

      const result = await gradingResultFactory.create({
        gradingSessionId: session.id,
        uploadedFileId: file.id,
        rubricId: rubric.id,
      });

      // Test cascading deletes - note that rubric has onDelete: Restrict
      // So we need to delete grading results first, then user
      await db.gradingResult.deleteMany({ where: { rubricId: rubric.id } });
      await db.user.delete({ where: { id: user.id } });

      // User-owned records should be deleted (cascade)
      const remainingSession = await db.gradingSession.findUnique({
        where: { id: session.id },
      });
      const remainingFile = await db.uploadedFile.findUnique({
        where: { id: file.id },
      });
      const remainingResult = await db.gradingResult.findUnique({
        where: { id: result.id },
      });

      expect(remainingSession).toBeNull();
      expect(remainingFile).toBeNull();
      expect(remainingResult).toBeNull();

      // Rubric should still exist (since we used RESTRICT and deleted the referencing records first)
      const remainingRubric = await db.rubric.findUnique({
        where: { id: rubric.id },
      });
      expect(remainingRubric).toBeNull(); // Should be deleted because user was deleted and rubric has CASCADE on user
    });
  });
}); 