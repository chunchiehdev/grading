import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTest, TestContext } from '../test-helpers';

describe('User Model', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTest();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('createUser', () => {
    it('should create user with email', async () => {
      const user = await testContext.userFactory.create({
        email: 'test@example.com'
      });

      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with auto-generated email', async () => {
      const user = await testContext.userFactory.create();
      expect(user.email).toMatch(/test-\d+@example\.com/);
    });

    it('should fail with duplicate email', async () => {
      await testContext.userFactory.create({
        email: 'duplicate@example.com'
      });

      await expect(
        testContext.userFactory.create({
          email: 'duplicate@example.com'
        })
      ).rejects.toThrow();
    });
  });

  describe('findUser', () => {
    it('should find user by email', async () => {
      const createdUser = await testContext.userFactory.create({
        email: 'find@example.com'
      });

      const foundUser = await testContext.prisma.user.findUnique({
        where: { email: 'find@example.com' }
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(createdUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await testContext.prisma.user.findUnique({
        where: { email: 'nonexistent@example.com' }
      });
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user email', async () => {
      const user = await testContext.userFactory.create({
        email: 'update@example.com'
      });

      const updatedUser = await testContext.prisma.user.update({
        where: { id: user.id },
        data: { email: 'updated@example.com' }
      });

      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = await testContext.userFactory.create({
        email: 'delete@example.com'
      });

      await testContext.prisma.user.delete({
        where: { id: user.id }
      });

      const deletedUser = await testContext.prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe('userRelations', () => {
    it('should create user with rubrics', async () => {
      const user = await testContext.userFactory.create({
        email: 'with-rubrics@example.com'
      });

      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Test Rubric',
        description: 'Test Description',
        criteria: [{ name: 'Test', description: 'Test', levels: [{ level: 1, description: 'Test', score: 10 }] }]
      });

      const userWithRubrics = await testContext.prisma.user.findUnique({
        where: { id: user.id },
        include: { rubrics: true }
      });

      expect(userWithRubrics?.rubrics).toHaveLength(1);
      expect(userWithRubrics?.rubrics[0].id).toBe(rubric.id);
    });

    it('should create user with uploads', async () => {
      const user = await testContext.userFactory.create({
        email: 'with-uploads@example.com'
      });

      const rubric = await testContext.rubricFactory.create({
        userId: user.id,
        name: 'Test Rubric',
        description: 'Test Description',
        criteria: [{ name: 'Test', description: 'Test', levels: [{ level: 1, description: 'Test', score: 10 }] }]
      });

      const upload = await testContext.prisma.upload.create({
        data: {
          userId: user.id,
          rubricId: rubric.id,
          originalFileName: 'test.pdf',
          storedFileKey: `test-${Date.now()}.pdf`,
          storageLocation: '/uploads/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf'
        }
      });

      const userWithUploads = await testContext.prisma.user.findUnique({
        where: { id: user.id },
        include: { uploads: true }
      });

      expect(userWithUploads?.uploads).toHaveLength(1);
      expect(userWithUploads?.uploads[0].id).toBe(upload.id);
    });
  });
}); 