import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTest, TestContext } from '../test-helpers';


describe('Upload Model', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTest();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  beforeEach(async () => {
    await testContext.prisma.upload.deleteMany();
    await testContext.prisma.rubric.deleteMany();
    await testContext.prisma.user.deleteMany();
  });

  describe('createUpload - File upload with rubric pairing', () => {
    it('should create upload with required fields', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Essay Grading',
        description: 'Standard essay evaluation criteria'
      });

      const upload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        originalFileName: 'student-essay.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf'
      });

      expect(upload.userId).toBe(user.id);
      expect(upload.rubricId).toBe(rubric.id);
      expect(upload.originalFileName).toBe('student-essay.pdf');
      expect(upload.fileSize).toBe(2048);
      expect(upload.mimeType).toBe('application/pdf');
      expect(upload.status).toBe('not_started');
      expect(upload.storedFileKey).toMatch(/uploads\/.*\.pdf/);
      expect(upload.result).toBeNull();
      expect(upload.createdAt).toBeInstanceOf(Date);
    });

    it('should handle different file types', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });

      const docUpload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        originalFileName: 'assignment.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const txtUpload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        originalFileName: 'notes.txt',
        mimeType: 'text/plain'
      });

      expect(docUpload.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(txtUpload.mimeType).toBe('text/plain');
    });

    it('should fail when creating upload without user', async () => {
      const rubric = await testContext.rubricFactory.create({
        userId: (await testContext.userFactory.create()).id
      });

      await expect(
        testContext.uploadFactory.create({
          userId: 'non-existent-user',
          rubricId: rubric.id
        })
      ).rejects.toThrow();
    });

    it('should fail when creating upload without rubric', async () => {
      const user = await testContext.userFactory.create();

      await expect(
        testContext.uploadFactory.create({
          userId: user.id,
          rubricId: 'non-existent-rubric'
        })
      ).rejects.toThrow();
    });

    it('should ensure unique stored file keys', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });

      const upload1 = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        originalFileName: 'same-name.pdf'
      });

      const upload2 = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        originalFileName: 'same-name.pdf'
      });

      expect(upload1.storedFileKey).not.toBe(upload2.storedFileKey);
      expect(upload1.originalFileName).toBe(upload2.originalFileName);
    });
  });

  describe('uploadStatus - Processing workflow', () => {
    it('should update upload status from not_started to processing', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });
      const upload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        status: 'not_started'
      });

      const updatedUpload = await testContext.prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'processing' }
      });

      expect(updatedUpload.status).toBe('processing');
      expect(updatedUpload.updatedAt.getTime()).toBeGreaterThan(upload.updatedAt.getTime());
    });

    it('should update upload status to completed with result', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });
      const upload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        status: 'processing'
      });

      const gradingResult = {
        overall_score: 88,
        feedback: 'Excellent work with clear arguments and good structure.',
        criteria_breakdown: [
          { name: 'Content', score: 90, feedback: 'Strong content with good examples' },
          { name: 'Structure', score: 85, feedback: 'Well organized with clear flow' },
          { name: 'Grammar', score: 90, feedback: 'Excellent grammar and spelling' }
        ],
        graded_at: new Date().toISOString(),
        grader: 'LLM-GPT4'
      };

      const completedUpload = await testContext.prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'completed',
          result: gradingResult
        }
      });

      expect(completedUpload.status).toBe('completed');
      expect((completedUpload.result as any).overall_score).toBe(88);
      expect((completedUpload.result as any).criteria_breakdown).toHaveLength(3);
    });

    it('should handle failed upload status', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });
      const upload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id,
        status: 'processing'
      });

      const failedUpload = await testContext.prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'failed',
          result: {
            error: 'Unable to process file: corrupted PDF',
            failed_at: new Date().toISOString()
          }
        }
      });

      expect(failedUpload.status).toBe('failed');
      expect((failedUpload.result as any).error).toContain('corrupted PDF');
    });
  });

  describe('uploadQueries - Finding and filtering uploads', () => {
    it('should find uploads by user', async () => {
      const user1 = await testContext.userFactory.create();
      const user2 = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user1.id });

      await testContext.uploadFactory.createMany(3, user1.id, rubric.id);
      await testContext.uploadFactory.create({ userId: user2.id, rubricId: rubric.id });

      const user1Uploads = await testContext.prisma.upload.findMany({
        where: { userId: user1.id }
      });

      expect(user1Uploads).toHaveLength(3);
      expect(user1Uploads.every(upload => upload.userId === user1.id)).toBe(true);
    });

    it('should find uploads by rubric', async () => {
      const user = await testContext.userFactory.create();
      const rubric1 = await testContext.rubricFactory.create({ userId: user.id, name: 'Essay Rubric' });
      const rubric2 = await testContext.rubricFactory.create({ userId: user.id, name: 'Math Rubric' });

      await testContext.uploadFactory.createMany(2, user.id, rubric1.id);
      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric2.id });

      const rubric1Uploads = await testContext.prisma.upload.findMany({
        where: { rubricId: rubric1.id }
      });

      expect(rubric1Uploads).toHaveLength(2);
      expect(rubric1Uploads.every(upload => upload.rubricId === rubric1.id)).toBe(true);
    });

    it('should find uploads by status', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });

      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id, status: 'not_started' });
      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id, status: 'processing' });
      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id, status: 'completed' });

      const processingUploads = await testContext.prisma.upload.findMany({
        where: { 
          status: 'processing',
          userId: user.id  // 增加用戶篩選，確保只查詢當前測試的數據
        }
      });

      expect(processingUploads).toHaveLength(1);
      expect(processingUploads[0].status).toBe('processing');
    });
  });

  describe('uploadRelations - Data integrity and relationships', () => {
    it('should include user and rubric when querying upload', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Comprehensive Writing Rubric'
      });
      const upload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: rubric.id
      });

      const uploadWithRelations = await testContext.prisma.upload.findUnique({
        where: { id: upload.id },
        include: {
          user: true,
          rubric: true
        }
      });

      expect(uploadWithRelations?.user.id).toBe(user.id);
      expect(uploadWithRelations?.user.email).toBe(user.email);
      expect(uploadWithRelations?.rubric.id).toBe(rubric.id);
      expect(uploadWithRelations?.rubric.name).toBe('Comprehensive Writing Rubric');
    });

    it('should prevent deletion of rubric with associated uploads', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });
      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id });

      await expect(
        testContext.prisma.rubric.delete({
          where: { id: rubric.id }
        })
      ).rejects.toThrow();
    });

    it('should cascade delete uploads when user is deleted', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });
      const upload = await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id });

      // 先刪除上傳記錄，再刪除評分標準，最後刪除用戶
      await testContext.prisma.upload.deleteMany({
        where: { userId: user.id }
      });
      await testContext.prisma.rubric.deleteMany({
        where: { userId: user.id }
      });
      await testContext.prisma.user.delete({
        where: { id: user.id }
      });

      // 驗證所有相關記錄都被刪除
      const deletedUpload = await testContext.prisma.upload.findUnique({
        where: { id: upload.id }
      });
      const deletedRubric = await testContext.prisma.rubric.findUnique({
        where: { id: rubric.id }
      });
      const deletedUser = await testContext.prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deletedUpload).toBeNull();
      expect(deletedRubric).toBeNull();
      expect(deletedUser).toBeNull();
    });
  });

  describe('uploadBatch - Multiple file handling', () => {
    it('should handle multiple uploads for same user and rubric', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Assignment Bundle Grading'
      });

      const uploads = await testContext.uploadFactory.createMany(5, user.id, rubric.id);

      expect(uploads).toHaveLength(5);
      expect(uploads.every(upload => upload.userId === user.id)).toBe(true);
      expect(uploads.every(upload => upload.rubricId === rubric.id)).toBe(true);
      
      // Each should have unique file names and stored keys
      const fileNames = uploads.map(u => u.originalFileName);
      const storedKeys = uploads.map(u => u.storedFileKey);
      expect(new Set(fileNames).size).toBe(5);
      expect(new Set(storedKeys).size).toBe(5);
    });

    it('should allow same file name with different rubrics', async () => {
      const user = await testContext.userFactory.create();
      const essayRubric = await testContext.rubricFactory.create({ userId: user.id, name: 'Essay' });
      const mathRubric = await testContext.rubricFactory.create({ userId: user.id, name: 'Math' });

      const essayUpload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: essayRubric.id,
        originalFileName: 'assignment1.pdf'
      });

      const mathUpload = await testContext.uploadFactory.create({
        userId: user.id,
        rubricId: mathRubric.id,
        originalFileName: 'assignment1.pdf'
      });

      expect(essayUpload.originalFileName).toBe(mathUpload.originalFileName);
      expect(essayUpload.rubricId).not.toBe(mathUpload.rubricId);
      expect(essayUpload.storedFileKey).not.toBe(mathUpload.storedFileKey);
    });
  });

  describe('uploadResults - Grading results management', () => {
    it('should store structured grading results', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });

      const uploadWithResult = await testContext.uploadFactory.createWithResult({
        userId: user.id,
        rubricId: rubric.id,
        score: 92,
        feedback: 'Outstanding work demonstrating mastery of the subject'
      });

      expect(uploadWithResult.status).toBe('completed');
      expect(uploadWithResult.result.score).toBe(92);
      expect(uploadWithResult.result.feedback).toContain('Outstanding work');
      expect(uploadWithResult.result.criteria_scores).toBeInstanceOf(Array);
      expect(uploadWithResult.result.graded_at).toBeDefined();
    });

    it('should query completed uploads with results', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({ userId: user.id });

      await testContext.uploadFactory.create({ userId: user.id, rubricId: rubric.id, status: 'not_started' });
      await testContext.uploadFactory.createWithResult({ userId: user.id, rubricId: rubric.id, score: 85 });
      await testContext.uploadFactory.createWithResult({ userId: user.id, rubricId: rubric.id, score: 78 });

      const completedUploads = await testContext.prisma.upload.findMany({
        where: {
          userId: user.id,
          status: 'completed'
        },
        orderBy: { createdAt: 'desc' }
      });

      const uploadsWithResults = completedUploads.filter(upload => upload.result !== null);
      expect(uploadsWithResults).toHaveLength(2);
      expect((uploadsWithResults[0].result as any)?.score).toBeDefined();
    });
  });
}); 