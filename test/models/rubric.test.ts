import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTest, TestContext } from '../test-helpers';

describe('Rubric Model', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTest();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('createRubric', () => {
    it('should create rubric with all required fields', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Essay Grading Rubric',
        description: 'Comprehensive rubric for essay evaluation',
        criteria: [
          {
            name: 'Content',
            description: 'Content quality and relevance',
            levels: [
              { level: 1, description: 'Poor', score: 1 },
              { level: 2, description: 'Fair', score: 2 },
              { level: 3, description: 'Good', score: 3 }
            ]
          }
        ]
      });

      expect(rubric.name).toBe('Essay Grading Rubric');
      expect(rubric.description).toBe('Comprehensive rubric for essay evaluation');
      expect(rubric.userId).toBe(user.id);
      expect(rubric.criteria).toBeInstanceOf(Array);
      expect(rubric.criteria[0].name).toBe('Content');
      expect(rubric.createdAt).toBeInstanceOf(Date);
      expect(rubric.updatedAt).toBeInstanceOf(Date);
    });

    it('should create rubric with empty criteria (draft state)', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Draft Rubric',
        description: 'Work in progress rubric',
        criteria: []
      });

      expect(rubric.name).toBe('Draft Rubric');
      expect(rubric.criteria).toEqual([]);
    });

    it('should fail when creating rubric without user', async () => {
      await expect(
        testContext.rubricFactory.create({
          userId: 'non-existent-user-id',
          name: 'Test Rubric',
          description: 'Test Description',
          criteria: []
        })
      ).rejects.toThrow();
    });

    it('should fail when creating rubric with empty name', async () => {
      const user = await testContext.userFactory.create();
      
      await expect(
        testContext.rubricFactory.create({
          userId: user.id,
          name: '',
          description: 'Valid description',
          criteria: []
        })
      ).rejects.toThrow('Rubric name is required and cannot be empty');
    });

    it('should fail when creating rubric with empty description', async () => {
      const user = await testContext.userFactory.create();
      
      await expect(
        testContext.rubricFactory.create({
          userId: user.id,
          name: 'Valid name',
          description: '',
          criteria: []
        })
      ).rejects.toThrow('Rubric description is required and cannot be empty');
    });
  });

  describe('findRubric - User selecting from available rubrics', () => {
    it('should find rubric by id', async () => {
      const user = await testContext.userFactory.create();
      const createdRubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Math Assignment Rubric',
        description: 'Rubric for math homework evaluation'
      });

      const foundRubric = await testContext.prisma.rubric.findUnique({
        where: { id: createdRubric.id }
      });

      expect(foundRubric).not.toBeNull();
      expect(foundRubric?.id).toBe(createdRubric.id);
      expect(foundRubric?.name).toBe('Math Assignment Rubric');
    });

    it('should find all rubrics by user (for dropdown selection)', async () => {
      const user = await testContext.userFactory.create();
      await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Essay Rubric',
        description: 'For essay grading'
      });
      await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Presentation Rubric',
        description: 'For presentation grading'
      });

      const userRubrics = await testContext.prisma.rubric.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, description: true }
      });

      expect(userRubrics).toHaveLength(2);
      expect(userRubrics.map(r => r.name)).toContain('Essay Rubric');
      expect(userRubrics.map(r => r.name)).toContain('Presentation Rubric');
    });
  });

  describe('updateRubric - User managing rubric standards', () => {
    it('should update rubric name and description', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Original Name',
        description: 'Original Description'
      });

      const updatedRubric = await testContext.prisma.rubric.update({
        where: { id: rubric.id },
        data: {
          name: 'Updated Assignment Rubric',
          description: 'Updated comprehensive grading criteria'
        }
      });

      expect(updatedRubric.name).toBe('Updated Assignment Rubric');
      expect(updatedRubric.description).toBe('Updated comprehensive grading criteria');
      expect(updatedRubric.id).toBe(rubric.id);
      expect(updatedRubric.updatedAt).toBeInstanceOf(Date);
    });

    it('should update rubric criteria', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Science Report Rubric',
        description: 'For science report evaluation'
      });

      const newCriteria = [
        {
          name: 'Scientific Method',
          description: 'Application of scientific method',
          levels: [
            { level: 1, description: 'Incomplete', score: 1 },
            { level: 2, description: 'Partial', score: 2 },
            { level: 3, description: 'Complete', score: 3 },
            { level: 4, description: 'Excellent', score: 4 }
          ]
        },
        {
          name: 'Data Analysis',
          description: 'Quality of data analysis',
          levels: [
            { level: 1, description: 'Poor', score: 1 },
            { level: 2, description: 'Fair', score: 2 },
            { level: 3, description: 'Good', score: 3 },
            { level: 4, description: 'Excellent', score: 4 }
          ]
        }
      ];

      const updatedRubric = await testContext.prisma.rubric.update({
        where: { id: rubric.id },
        data: { criteria: newCriteria }
      });

      expect(updatedRubric.criteria).toEqual(newCriteria);
      expect(updatedRubric.criteria).toHaveLength(2);
    });
  });

  describe('deleteRubric - User removing unused standards', () => {
    it('should delete rubric successfully', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Obsolete Rubric',
        description: 'No longer needed'
      });

      await testContext.prisma.rubric.delete({
        where: { id: rubric.id }
      });

      const deletedRubric = await testContext.prisma.rubric.findUnique({
        where: { id: rubric.id }
      });

      expect(deletedRubric).toBeNull();
    });

    it('should fail to delete rubric with associated uploads', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'In-Use Rubric',
        description: 'Currently used for grading'
      });

      // Create an upload that uses this rubric
      await testContext.prisma.upload.create({
        data: {
          userId: user.id,
          rubricId: rubric.id,
          originalFileName: 'student-assignment.pdf',
          storedFileKey: `assignment-${Date.now()}.pdf`,
          storageLocation: '/uploads/assignment.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf'
        }
      });

      await expect(
        testContext.prisma.rubric.delete({
          where: { id: rubric.id }
        })
      ).rejects.toThrow();
    });
  });

  describe('rubricRelations - Data integrity', () => {
    it('should include user when querying rubric', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Literature Analysis Rubric',
        description: 'For analyzing literary works'
      });

      const rubricWithUser = await testContext.prisma.rubric.findUnique({
        where: { id: rubric.id },
        include: { user: true }
      });

      expect(rubricWithUser?.user).not.toBeNull();
      expect(rubricWithUser?.user.id).toBe(user.id);
      expect(rubricWithUser?.user.email).toBe(user.email);
    });

    it('should include uploads when querying rubric', async () => {
      const user = await testContext.userFactory.create();
      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Assignment Rubric',
        description: 'General assignment grading'
      });

      // Create uploads that use this rubric
      await testContext.prisma.upload.create({
        data: {
          userId: user.id,
          rubricId: rubric.id,
          originalFileName: 'assignment1.pdf',
          storedFileKey: `assignment1-${Date.now()}.pdf`,
          storageLocation: '/uploads/assignment1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf'
        }
      });

      await testContext.prisma.upload.create({
        data: {
          userId: user.id,
          rubricId: rubric.id,
          originalFileName: 'assignment2.pdf',
          storedFileKey: `assignment2-${Date.now()}.pdf`,
          storageLocation: '/uploads/assignment2.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf'
        }
      });

      const rubricWithUploads = await testContext.prisma.rubric.findUnique({
        where: { id: rubric.id },
        include: { uploads: true }
      });

      expect(rubricWithUploads?.uploads).toHaveLength(2);
      expect(rubricWithUploads?.uploads[0].originalFileName).toBe('assignment1.pdf');
      expect(rubricWithUploads?.uploads[1].originalFileName).toBe('assignment2.pdf');
    });
  });
});