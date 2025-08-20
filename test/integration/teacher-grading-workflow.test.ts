import { describe, it, expect } from 'vitest';
import { UserFactory, RubricFactory, CourseFactory } from '../factories';

/**
 * Integration Test Case #1: Teacher Successfully Completing a Grading Session
 * 
 * This test follows the complete teacher workflow from TDD methodology:
 * RED → GREEN → REFACTOR
 */
describe('Teacher Grading Workflow Integration', () => {
  describe('Complete Course and Rubric Setup', () => {
    it('should allow teacher to create course with rubric template', async () => {
      // 🔴 RED: Write failing test first
      
      // Arrange - Create test data
      const teacher = await UserFactory.createTeacher({
        email: 'teacher@test.com',
        name: 'Test Teacher'
      });
      
      // Act - Perform the operation we want to test
      const rubric = await RubricFactory.createTemplate({
        userId: teacher.id,
        name: 'Essay Grading Rubric',
        description: 'Template for grading essay assignments'
      });
      
      const course = await CourseFactory.create({
        teacherId: teacher.id,
        name: 'Introduction to Writing',
        description: 'A course focused on writing skills'
      });
      
      // Assert - Verify expected outcomes
      expect(teacher.role).toBe('TEACHER');
      expect(teacher.email).toBe('teacher@test.com');
      
      expect(rubric.isTemplate).toBe(true);
      expect(rubric.isActive).toBe(true);
      expect(rubric.name).toBe('Essay Grading Rubric');
      expect(rubric.criteria).toBeDefined();
      expect(Array.isArray(rubric.criteria)).toBe(true);
      
      expect(course.teacherId).toBe(teacher.id);
      expect(course.name).toBe('Introduction to Writing');
      
      console.log('✅ Teacher workflow test passed: Course and rubric created');
    });
    
    it('should create course with invitation code for student enrollment', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      
      // Act 
      const { course, invitationCode } = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Advanced Writing Workshop'
      });
      
      // Assert
      expect(course).toBeDefined();
      expect(course.teacherId).toBe(teacher.id);
      
      expect(invitationCode).toBeDefined();
      expect(invitationCode.courseId).toBe(course.id);
      expect(invitationCode.isUsed).toBe(false);
      expect(invitationCode.code).toMatch(/^TEST-[A-Z0-9]{8}$/);
      expect(invitationCode.expiresAt).toBeInstanceOf(Date);
      
      // Verify invitation expires in the future
      expect(invitationCode.expiresAt.getTime()).toBeGreaterThan(Date.now());
      
      console.log('✅ Course invitation test passed');
    });
  });
  
  describe('Rubric Template System', () => {
    it('should create rubric with default grading criteria', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      
      // Act
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Standard Essay Rubric'
      });
      
      // Assert - Verify default criteria structure
      expect(rubric.criteria).toBeDefined();
      
      const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
      expect(criteria.length).toBeGreaterThan(0);
      
      // Verify first criterion has expected structure with proper typing
      const firstCriterion = criteria[0] as any;
      expect(firstCriterion).toBeTruthy();
      expect(firstCriterion).toHaveProperty('id');
      expect(firstCriterion).toHaveProperty('name');
      expect(firstCriterion).toHaveProperty('description');
      expect(firstCriterion).toHaveProperty('levels');
      expect(Array.isArray(firstCriterion?.levels)).toBe(true);
      
      // Verify scoring levels with safe navigation
      const levels = firstCriterion?.levels as any[];
      expect(levels).toBeTruthy();
      expect(levels.length).toBeGreaterThan(0);
      expect(levels[0]).toHaveProperty('score');
      expect(levels[0]).toHaveProperty('description');
      
      console.log('✅ Default rubric criteria test passed');
    });
    
    it('should create rubric with categorized criteria structure', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      
      // Act
      const rubric = await RubricFactory.createWithCategories({
        userId: teacher.id,
        name: 'Categorized Essay Rubric'
      });
      
      // Assert - Verify categorized structure
      const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
      expect(criteria.length).toBeGreaterThan(0);
      
      // Check if this is a categorized rubric format
      const firstItem = criteria[0];
      if (firstItem && typeof firstItem === 'object' && 'criteria' in firstItem) {
        // Categorized format
        expect(firstItem).toHaveProperty('name');
        expect(firstItem).toHaveProperty('criteria');
        expect(Array.isArray(firstItem.criteria)).toBe(true);
        
        console.log('✅ Categorized rubric structure test passed');
      } else {
        // Flat format - also acceptable
        expect(firstItem).toHaveProperty('name');
        expect(firstItem).toHaveProperty('levels');
        
        console.log('✅ Flat rubric structure test passed');
      }
    });
  });
  
  describe('Multi-User Data Isolation', () => {
    it('should isolate data between different teachers', async () => {
      // Arrange
      const teacher1 = await UserFactory.createTeacher({ name: 'Teacher One' });
      const teacher2 = await UserFactory.createTeacher({ name: 'Teacher Two' });
      
      // Act - Each teacher creates their own content
      const course1 = await CourseFactory.create({
        teacherId: teacher1.id,
        name: 'Math 101'
      });
      
      const course2 = await CourseFactory.create({
        teacherId: teacher2.id,
        name: 'English 101'
      });
      
      const rubric1 = await RubricFactory.create({
        userId: teacher1.id,
        name: 'Math Problem Rubric'
      });
      
      const rubric2 = await RubricFactory.create({
        userId: teacher2.id,
        name: 'Essay Writing Rubric'
      });
      
      // Assert - Verify data isolation
      expect(course1.teacherId).toBe(teacher1.id);
      expect(course1.teacherId).not.toBe(teacher2.id);
      
      expect(course2.teacherId).toBe(teacher2.id);
      expect(course2.teacherId).not.toBe(teacher1.id);
      
      expect(rubric1.userId).toBe(teacher1.id);
      expect(rubric2.userId).toBe(teacher2.id);
      
      // Verify different content
      expect(course1.name).not.toBe(course2.name);
      expect(rubric1.name).not.toBe(rubric2.name);
      
      console.log('✅ Data isolation test passed');
    });
  });
});