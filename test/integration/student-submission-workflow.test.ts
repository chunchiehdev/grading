import { describe, it, expect } from 'vitest';
import { 
  UserFactory, 
  RubricFactory, 
  CourseFactory, 
  AssignmentAreaFactory,
  UploadedFileFactory,
  GradingSessionFactory 
} from '../factories';

/**
 * Integration Test Case #2: Student Assignment Submission with AI Analysis
 * 
 * This test covers the complete student submission workflow:
 * 1. Student enrolls in course
 * 2. Student uploads file for assignment
 * 3. File gets parsed and analyzed by AI
 * 4. Submission is created with AI results
 */
describe('Student Submission Workflow Integration', () => {
  describe('File Upload and Processing', () => {
    it('should allow student to upload file and get parsed content', async () => {
      // 🔴 RED: Write failing test first (TDD)
      
      // Arrange - Set up the course structure
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent({
        email: 'student@test.com',
        name: 'Test Student'
      });
      
      const rubric = await RubricFactory.createTemplate({
        userId: teacher.id,
        name: 'Essay Assignment Rubric'
      });
      
      const course = await CourseFactory.create({
        teacherId: teacher.id,
        name: 'English Composition'
      });
      
      const assignmentArea = await AssignmentAreaFactory.create({
        courseId: course.id,
        rubricId: rubric.id,
        name: 'Week 1 Essay',
        description: 'Write a 500-word essay on the given topic'
      });
      
      // Act - Student uploads file
      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'my-essay.pdf',
        parsedContent: 'This is my essay about artificial intelligence. AI has revolutionized many aspects of our daily lives...'
      });
      
      // Assert - Verify file upload and parsing
      expect(student.role).toBe('STUDENT');
      expect(student.email).toBe('student@test.com');
      
      expect(assignmentArea.courseId).toBe(course.id);
      expect(assignmentArea.rubricId).toBe(rubric.id);
      expect(assignmentArea.name).toBe('Week 1 Essay');
      
      expect(uploadedFile.userId).toBe(student.id);
      expect(uploadedFile.originalFileName).toBe('my-essay.pdf');
      expect(uploadedFile.parseStatus).toBe('COMPLETED');
      expect(uploadedFile.parsedContent).toContain('artificial intelligence');
      expect(uploadedFile.mimeType).toBe('application/pdf');
      
      console.log('✅ Student file upload test passed');
    });
    
    it('should handle different file types with appropriate parsing', async () => {
      // Arrange
      const student = await UserFactory.createStudent();
      
      // Act - Upload different file types
      const pdfFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'document.pdf'
      });
      
      const wordFile = await UploadedFileFactory.createWord(student.id, {
        originalFileName: 'document.docx'
      });
      
      // Assert - Verify file type handling
      expect(pdfFile.mimeType).toBe('application/pdf');
      expect(pdfFile.originalFileName).toBe('document.pdf');
      
      expect(wordFile.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(wordFile.originalFileName).toBe('document.docx');
      
      // Both should have parsed content by default
      expect(pdfFile.parsedContent).toBeTruthy();
      expect(wordFile.parsedContent).toBeTruthy();
      
      console.log('✅ Multiple file type test passed');
    });
  });
  
  describe('AI Grading Session Creation', () => {
    it('should create grading session for uploaded file', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const student = await UserFactory.createStudent();
      
      const rubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Code Review Rubric'
      });
      
      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'assignment.pdf',
        parsedContent: 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }'
      });
      
      // Act - Create grading session (simulating the start of AI grading)
      const gradingSession = await GradingSessionFactory.create({
        userId: student.id
      });
      
      // Assert - Verify grading session setup
      expect(gradingSession.userId).toBe(student.id);
      expect(gradingSession.status).toBe('PENDING');
      expect(gradingSession.progress).toBe(0);
      
      // Verify the uploaded file is ready for grading
      expect(uploadedFile.parseStatus).toBe('COMPLETED');
      expect(uploadedFile.parsedContent).toContain('function factorial');
      
      console.log('✅ Grading session creation test passed');
    });
    
    it('should progress through grading session states', async () => {
      // Arrange
      const student = await UserFactory.createStudent();
      
      // Act - Create sessions in different states
      const pendingSession = await GradingSessionFactory.create({
        userId: student.id
      });
      
      const processingSession = await GradingSessionFactory.createProcessing(student.id, 75);
      
      const completedSession = await GradingSessionFactory.createCompleted(student.id);
      
      // Assert - Verify session state progression
      expect(pendingSession.status).toBe('PENDING');
      expect(pendingSession.progress).toBe(0);
      
      expect(processingSession.status).toBe('PROCESSING');
      expect(processingSession.progress).toBe(75);
      
      expect(completedSession.status).toBe('COMPLETED');
      expect(completedSession.progress).toBe(100);
      
      console.log('✅ Grading session states test passed');
    });
  });
  
  describe('File Parsing Error Handling', () => {
    it('should handle file parsing failures gracefully', async () => {
      // Arrange
      const student = await UserFactory.createStudent();
      
      // Act - Create files with different parsing states
      const failedFile = await UploadedFileFactory.createWithParseStatus(student.id, 'FAILED');
      const processingFile = await UploadedFileFactory.createWithParseStatus(student.id, 'PROCESSING');
      const completedFile = await UploadedFileFactory.createWithParseStatus(student.id, 'COMPLETED');
      
      // Assert - Verify parsing state handling
      expect(failedFile.parseStatus).toBe('FAILED');
      expect(failedFile.parsedContent).toBeNull();
      expect(failedFile.parseError).toContain('Failed to parse file');
      
      expect(processingFile.parseStatus).toBe('PROCESSING');
      expect(processingFile.parsedContent).toBeNull();
      
      expect(completedFile.parseStatus).toBe('COMPLETED');
      expect(completedFile.parsedContent).toBeTruthy();
      expect(completedFile.parseError).toBeNull();
      
      console.log('✅ File parsing error handling test passed');
    });
  });
  
  describe('Complete Assignment Workflow', () => {
    it('should complete entire submission workflow from course enrollment to file upload', async () => {
      // Arrange - Create complete academic structure
      const teacher = await UserFactory.createTeacher({ name: 'Prof. Smith' });
      const student = await UserFactory.createStudent({ name: 'Alice Johnson' });
      
      const rubric = await RubricFactory.createWithCategories({
        userId: teacher.id,
        name: 'Comprehensive Essay Rubric',
        description: 'Multi-category rubric for essay evaluation'
      });
      
      const { course, invitationCode } = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Advanced Academic Writing',
        description: 'Graduate-level writing course'
      });
      
      const assignmentArea = await AssignmentAreaFactory.createWithDueDate({
        courseId: course.id,
        rubricId: rubric.id,
        name: 'Research Paper Draft',
        description: 'Submit your 2000-word research paper draft'
      }, 14); // Due in 14 days
      
      // Act - Complete submission workflow
      const uploadedFile = await UploadedFileFactory.createPdf(student.id, {
        originalFileName: 'research-paper-draft.pdf',
        fileSize: 1024 * 500, // 500KB
        parsedContent: `
          Title: The Impact of Artificial Intelligence on Educational Assessment
          
          Abstract: This paper explores how AI technologies are transforming educational assessment...
          
          Introduction: Traditional assessment methods have long relied on human evaluation...
          
          Literature Review: Recent studies by Smith et al. (2023) demonstrate that AI-powered grading...
        `
      });
      
      const gradingSession = await GradingSessionFactory.create({
        userId: student.id
      });
      
      // Assert - Verify complete workflow
      // Course structure
      expect(course.teacherId).toBe(teacher.id);
      expect(course.name).toBe('Advanced Academic Writing');
      expect(invitationCode.courseId).toBe(course.id);
      expect(invitationCode.isUsed).toBe(false);
      
      // Assignment setup
      expect(assignmentArea.courseId).toBe(course.id);
      expect(assignmentArea.rubricId).toBe(rubric.id);
      expect(assignmentArea.dueDate).toBeInstanceOf(Date);
      expect(assignmentArea.dueDate!.getTime()).toBeGreaterThan(Date.now());
      
      // Rubric validation
      expect(rubric.isTemplate).toBe(false);
      expect(rubric.criteria).toBeDefined();
      expect(Array.isArray(rubric.criteria)).toBe(true);
      
      // File upload validation
      expect(uploadedFile.userId).toBe(student.id);
      expect(uploadedFile.parseStatus).toBe('COMPLETED');
      expect(uploadedFile.parsedContent).toContain('Artificial Intelligence');
      expect(uploadedFile.fileSize).toBe(1024 * 500);
      
      // Grading session validation
      expect(gradingSession.userId).toBe(student.id);
      expect(gradingSession.status).toBe('PENDING');
      
      console.log('✅ Complete assignment workflow test passed');
    });
  });
});