import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { UserFactory, RubricFactory, CourseFactory, AssignmentAreaFactory } from '../factories';
import { db } from '@/types/database';

/**
 * Integration Test #5: Rubric Versioning & Templates
 *
 * Tests rubric template system, versioning, reusability across courses,
 * and template management workflows. Validates that teachers can create
 * reusable rubric templates and manage different versions efficiently.
 */
describe('Rubric Versioning & Templates Integration', () => {
  describe('Template Creation and Management', () => {
    it('should create and manage rubric templates for reuse across courses', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Template',
        email: 'prof.template@university.edu',
      });

      // Act - Create a template rubric
      const templateRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Standard Essay Template',
        description: 'Reusable template for essay grading across multiple courses',
        isTemplate: true,
        criteria: [
          {
            id: uuidv4(),
            name: 'Content & Analysis',
            description: 'Quality of content and analytical thinking',
            maxScore: 40,
            levels: [
              { score: 40, description: 'Exceptional analysis with original insights' },
              { score: 35, description: 'Strong analysis with good insights' },
              { score: 30, description: 'Adequate analysis with some insights' },
              { score: 25, description: 'Basic analysis with limited insights' },
              { score: 20, description: 'Superficial analysis' },
              { score: 0, description: 'No meaningful analysis' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Organization & Structure',
            description: 'Essay structure, flow, and logical organization',
            maxScore: 30,
            levels: [
              { score: 30, description: 'Excellent organization with clear, logical flow' },
              { score: 25, description: 'Good organization with minor issues' },
              { score: 20, description: 'Adequate organization' },
              { score: 15, description: 'Some organizational problems' },
              { score: 10, description: 'Poor organization' },
              { score: 0, description: 'No clear organization' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Writing & Mechanics',
            description: 'Grammar, style, clarity, and technical writing skills',
            maxScore: 30,
            levels: [
              { score: 30, description: 'Flawless writing with sophisticated style' },
              { score: 25, description: 'Strong writing with minor errors' },
              { score: 20, description: 'Good writing with some errors' },
              { score: 15, description: 'Adequate writing with noticeable errors' },
              { score: 10, description: 'Poor writing with many errors' },
              { score: 0, description: 'Very poor writing, difficult to understand' },
            ],
          },
        ],
      });

      // Assert - Template should be properly created
      expect(templateRubric.isTemplate).toBe(true);
      expect(templateRubric.name).toBe('Standard Essay Template');
      expect(Array.isArray(templateRubric.criteria)).toBe(true);
      expect(templateRubric.criteria).toHaveLength(3);

      // Verify template can be found in template queries
      const templates = await db.rubric.findMany({
        where: {
          userId: teacher.id,
          isTemplate: true,
        },
      });

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(templateRubric.id);

      console.log('✅ Rubric template creation test passed');
      console.log(`   • Template: "${templateRubric.name}"`);
      console.log(`   • Criteria count: ${templateRubric.criteria.length}`);
      console.log(`   • Template ID: ${templateRubric.id}`);
    });

    it('should allow template reuse across multiple courses and assignments', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Reuse',
        email: 'prof.reuse@university.edu',
      });

      // Create a template rubric
      const template = await RubricFactory.create({
        userId: teacher.id,
        name: 'Universal Writing Rubric',
        description: 'Template for all writing assignments',
        isTemplate: true,
        criteria: [
          {
            id: uuidv4(),
            name: 'Clarity of Expression',
            description: 'How clearly ideas are communicated',
            maxScore: 50,
            levels: [
              { score: 50, description: 'Crystal clear communication' },
              { score: 40, description: 'Clear communication' },
              { score: 30, description: 'Mostly clear' },
              { score: 20, description: 'Sometimes unclear' },
              { score: 10, description: 'Often unclear' },
              { score: 0, description: 'Very unclear' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Depth of Thinking',
            description: 'Sophistication and depth of analysis',
            maxScore: 50,
            levels: [
              { score: 50, description: 'Exceptionally deep and sophisticated' },
              { score: 40, description: 'Deep thinking evident' },
              { score: 30, description: 'Good depth' },
              { score: 20, description: 'Adequate depth' },
              { score: 10, description: 'Shallow thinking' },
              { score: 0, description: 'No depth evident' },
            ],
          },
        ],
      });

      // Create multiple courses
      const courses = await Promise.all([
        CourseFactory.createWithInvitation(teacher.id, {
          name: 'English Composition',
          description: 'Writing skills development',
        }),
        CourseFactory.createWithInvitation(teacher.id, {
          name: 'Philosophy Essays',
          description: 'Philosophical writing and argumentation',
        }),
        CourseFactory.createWithInvitation(teacher.id, {
          name: 'Creative Writing',
          description: 'Creative expression and storytelling',
        }),
      ]);

      // Act - Use the same template across multiple assignment areas
      const assignments = await Promise.all([
        AssignmentAreaFactory.create({
          courseId: courses[0].course.id,
          rubricId: template.id,
          name: 'Personal Narrative Essay',
          description: 'Write a personal narrative using clear structure',
        }),
        AssignmentAreaFactory.create({
          courseId: courses[1].course.id,
          rubricId: template.id,
          name: 'Philosophical Argument Paper',
          description: 'Present a philosophical argument with clear reasoning',
        }),
        AssignmentAreaFactory.create({
          courseId: courses[2].course.id,
          rubricId: template.id,
          name: 'Short Story Assignment',
          description: 'Create an original short story with strong narrative',
        }),
      ]);

      // Assert - Template should be reused across all assignments
      expect(assignments).toHaveLength(3);
      assignments.forEach((assignment) => {
        expect(assignment.rubricId).toBe(template.id);
      });

      // Verify template usage tracking
      const templateWithUsage = await db.rubric.findUnique({
        where: { id: template.id },
        include: {
          assignmentAreas: {
            include: { course: true },
          },
        },
      });

      expect(templateWithUsage!.assignmentAreas).toHaveLength(3);
      expect(templateWithUsage!.isTemplate).toBe(true);

      // Verify assignments span different courses
      const courseIds = templateWithUsage!.assignmentAreas.map((a) => a.course.id);
      const uniqueCourseIds = new Set(courseIds);
      expect(uniqueCourseIds.size).toBe(3); // Template used in 3 different courses

      console.log('✅ Template reuse across courses test passed');
      console.log(`   • Template used in ${assignments.length} assignments`);
      console.log(`   • Across ${uniqueCourseIds.size} different courses`);
      console.log(`   • Courses: ${templateWithUsage!.assignmentAreas.map((a) => a.course.name).join(', ')}`);
    });

    it('should distinguish between templates and regular rubrics', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();

      // Create mix of template and regular rubrics
      const templateRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Code Review Template',
        description: 'Reusable template for code reviews',
        isTemplate: true,
      });

      const regularRubric1 = await RubricFactory.create({
        userId: teacher.id,
        name: 'Specific Assignment Rubric',
        description: 'One-time use rubric for specific assignment',
        isTemplate: false,
      });

      const regularRubric2 = await RubricFactory.create({
        userId: teacher.id,
        name: 'Another Regular Rubric',
        description: 'Another non-template rubric',
        // isTemplate defaults to false
      });

      // Act - Query templates and regular rubrics separately
      const templates = await db.rubric.findMany({
        where: {
          userId: teacher.id,
          isTemplate: true,
        },
      });

      const regularRubrics = await db.rubric.findMany({
        where: {
          userId: teacher.id,
          isTemplate: false,
        },
      });

      const allTeacherRubrics = await db.rubric.findMany({
        where: { userId: teacher.id },
      });

      // Assert - Proper categorization
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(templateRubric.id);
      expect(templates[0].isTemplate).toBe(true);

      expect(regularRubrics).toHaveLength(2);
      expect(regularRubrics.every((r) => r.isTemplate === false)).toBe(true);

      expect(allTeacherRubrics).toHaveLength(3);

      console.log('✅ Template vs regular rubric distinction test passed');
      console.log(`   • Templates: ${templates.length}`);
      console.log(`   • Regular rubrics: ${regularRubrics.length}`);
      console.log(`   • Total rubrics: ${allTeacherRubrics.length}`);
    });
  });

  describe('Rubric Versioning and Evolution', () => {
    it('should support creating new versions of existing rubrics', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Version',
        email: 'prof.version@university.edu',
      });

      // Create original rubric (version 1)
      const originalRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Data Analysis Rubric v1.0',
        description: 'Initial version for data analysis assignments',
        isTemplate: true,
        criteria: [
          {
            id: uuidv4(),
            name: 'Data Collection',
            description: 'Quality of data gathering methods',
            maxScore: 30,
            levels: [
              { score: 30, description: 'Excellent data collection' },
              { score: 20, description: 'Good data collection' },
              { score: 10, description: 'Adequate data collection' },
              { score: 0, description: 'Poor data collection' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Analysis Methods',
            description: 'Appropriate use of analytical techniques',
            maxScore: 40,
            levels: [
              { score: 40, description: 'Sophisticated analysis methods' },
              { score: 30, description: 'Good analysis methods' },
              { score: 20, description: 'Basic analysis methods' },
              { score: 0, description: 'Inappropriate or no analysis' },
            ],
          },
        ],
      });

      // Act - Create improved version (version 2) with additional criteria
      const improvedRubric = await RubricFactory.create({
        userId: teacher.id,
        name: 'Data Analysis Rubric v2.0',
        description: 'Enhanced version with additional criteria for data visualization',
        isTemplate: true,
        criteria: [
          // Keep original criteria but refine them
          {
            id: uuidv4(),
            name: 'Data Collection & Sources',
            description: 'Quality and reliability of data gathering methods and sources',
            maxScore: 25, // Reduced to make room for new criterion
            levels: [
              { score: 25, description: 'Excellent data collection with reliable sources' },
              { score: 20, description: 'Good data collection with mostly reliable sources' },
              { score: 15, description: 'Adequate data collection' },
              { score: 10, description: 'Poor data collection' },
              { score: 0, description: 'No systematic data collection' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Statistical Analysis',
            description: 'Appropriate use of statistical and analytical techniques',
            maxScore: 35, // Slightly reduced
            levels: [
              { score: 35, description: 'Sophisticated and appropriate statistical analysis' },
              { score: 30, description: 'Good statistical analysis' },
              { score: 25, description: 'Adequate analysis methods' },
              { score: 15, description: 'Basic analysis with some issues' },
              { score: 0, description: 'Inappropriate or no statistical analysis' },
            ],
          },
          // New criterion added in v2.0
          {
            id: uuidv4(),
            name: 'Data Visualization',
            description: 'Quality and effectiveness of charts, graphs, and visual presentations',
            maxScore: 25,
            levels: [
              { score: 25, description: 'Excellent visualizations that enhance understanding' },
              { score: 20, description: 'Good visualizations with clear presentation' },
              { score: 15, description: 'Adequate visualizations' },
              { score: 10, description: 'Poor or confusing visualizations' },
              { score: 0, description: 'No data visualization provided' },
            ],
          },
          // Another new criterion
          {
            id: uuidv4(),
            name: 'Interpretation & Conclusions',
            description: 'Quality of data interpretation and soundness of conclusions',
            maxScore: 15,
            levels: [
              { score: 15, description: 'Insightful interpretation with sound conclusions' },
              { score: 12, description: 'Good interpretation and conclusions' },
              { score: 8, description: 'Adequate interpretation' },
              { score: 4, description: 'Poor interpretation or unsupported conclusions' },
              { score: 0, description: 'No meaningful interpretation' },
            ],
          },
        ],
      });

      // Assert - Both versions should exist independently
      expect(originalRubric.name).toBe('Data Analysis Rubric v1.0');
      expect(originalRubric.criteria).toHaveLength(2);

      expect(improvedRubric.name).toBe('Data Analysis Rubric v2.0');
      expect(improvedRubric.criteria).toHaveLength(4);

      // Verify both are templates
      expect(originalRubric.isTemplate).toBe(true);
      expect(improvedRubric.isTemplate).toBe(true);

      // Verify they are separate entities
      expect(originalRubric.id).not.toBe(improvedRubric.id);

      // Calculate total scores for comparison
      const v1MaxScore = originalRubric.criteria.reduce((sum, c: any) => sum + c.maxScore, 0);
      const v2MaxScore = improvedRubric.criteria.reduce((sum, c: any) => sum + c.maxScore, 0);

      expect(v1MaxScore).toBe(70); // 30 + 40
      expect(v2MaxScore).toBe(100); // 25 + 35 + 25 + 15

      console.log('✅ Rubric versioning test passed');
      console.log(`   • v1.0: ${originalRubric.criteria.length} criteria, ${v1MaxScore} points total`);
      console.log(`   • v2.0: ${improvedRubric.criteria.length} criteria, ${v2MaxScore} points total`);
      console.log(`   • Added: Data Visualization, Interpretation & Conclusions`);
    });

    it('should track rubric usage across different versions', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();

      // Create v1 and v2 of a rubric
      const rubricV1 = await RubricFactory.create({
        userId: teacher.id,
        name: 'Research Paper Rubric v1',
        description: 'First version',
        isTemplate: true,
      });

      const rubricV2 = await RubricFactory.create({
        userId: teacher.id,
        name: 'Research Paper Rubric v2',
        description: 'Second version with improvements',
        isTemplate: true,
      });

      // Create courses
      const course1 = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Research Methods Fall',
        description: 'Fall semester research methods',
      });

      const course2 = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Research Methods Spring',
        description: 'Spring semester research methods',
      });

      // Act - Use v1 in fall course, v2 in spring course
      const fallAssignment = await AssignmentAreaFactory.create({
        courseId: course1.course.id,
        rubricId: rubricV1.id,
        name: 'Fall Research Project',
        description: 'Fall semester research project using v1 rubric',
      });

      const springAssignment = await AssignmentAreaFactory.create({
        courseId: course2.course.id,
        rubricId: rubricV2.id,
        name: 'Spring Research Project',
        description: 'Spring semester research project using v2 rubric',
      });

      // Act - Query usage for both versions
      const v1Usage = await db.rubric.findUnique({
        where: { id: rubricV1.id },
        include: {
          assignmentAreas: {
            include: { course: true },
          },
        },
      });

      const v2Usage = await db.rubric.findUnique({
        where: { id: rubricV2.id },
        include: {
          assignmentAreas: {
            include: { course: true },
          },
        },
      });

      // Assert - Each version should have its own usage tracking
      expect(v1Usage!.assignmentAreas).toHaveLength(1);
      expect(v1Usage!.assignmentAreas[0].course.name).toBe('Research Methods Fall');

      expect(v2Usage!.assignmentAreas).toHaveLength(1);
      expect(v2Usage!.assignmentAreas[0].course.name).toBe('Research Methods Spring');

      // Verify independent tracking
      expect(v1Usage!.id).not.toBe(v2Usage!.id);
      expect(fallAssignment.rubricId).toBe(rubricV1.id);
      expect(springAssignment.rubricId).toBe(rubricV2.id);

      console.log('✅ Multi-version usage tracking test passed');
      console.log(`   • V1 used in: ${v1Usage!.assignmentAreas[0].course.name}`);
      console.log(`   • V2 used in: ${v2Usage!.assignmentAreas[0].course.name}`);
    });
  });

  describe('Template Sharing and Collaboration', () => {
    it('should support template discovery within institution context', async () => {
      // Arrange - Multiple teachers creating templates
      const teachers = await Promise.all([
        UserFactory.createTeacher({
          name: 'Prof. Math',
          email: 'prof.math@university.edu',
        }),
        UserFactory.createTeacher({
          name: 'Prof. Science',
          email: 'prof.science@university.edu',
        }),
        UserFactory.createTeacher({
          name: 'Prof. English',
          email: 'prof.english@university.edu',
        }),
      ]);

      // Create diverse templates
      const templates = await Promise.all([
        RubricFactory.create({
          userId: teachers[0].id,
          name: 'Mathematics Problem Solving Template',
          description: 'Template for math problem-solving assessments',
          isTemplate: true,
          criteria: [
            {
              id: uuidv4(),
              name: 'Problem Understanding',
              description: 'Understanding of the mathematical problem',
              maxScore: 25,
              levels: [
                { score: 25, description: 'Complete understanding' },
                { score: 20, description: 'Good understanding' },
                { score: 15, description: 'Partial understanding' },
                { score: 10, description: 'Minimal understanding' },
                { score: 0, description: 'No understanding' },
              ],
            },
            {
              id: uuidv4(),
              name: 'Solution Strategy',
              description: 'Choice and implementation of solution approach',
              maxScore: 35,
              levels: [
                { score: 35, description: 'Excellent strategy and execution' },
                { score: 28, description: 'Good strategy with minor issues' },
                { score: 21, description: 'Adequate strategy' },
                { score: 14, description: 'Poor strategy choice' },
                { score: 0, description: 'No coherent strategy' },
              ],
            },
          ],
        }),
        RubricFactory.create({
          userId: teachers[1].id,
          name: 'Scientific Report Template',
          description: 'Template for laboratory reports and scientific writing',
          isTemplate: true,
          criteria: [
            {
              id: uuidv4(),
              name: 'Hypothesis Formation',
              description: 'Quality of hypothesis and predictions',
              maxScore: 20,
              levels: [
                { score: 20, description: 'Clear, testable hypothesis' },
                { score: 15, description: 'Good hypothesis' },
                { score: 10, description: 'Adequate hypothesis' },
                { score: 5, description: 'Poor hypothesis' },
                { score: 0, description: 'No hypothesis' },
              ],
            },
          ],
        }),
        RubricFactory.create({
          userId: teachers[2].id,
          name: 'Literary Analysis Template',
          description: 'Template for literature and text analysis assignments',
          isTemplate: true,
          criteria: [
            {
              id: uuidv4(),
              name: 'Use of Textual Evidence',
              description: 'Quality and relevance of textual support',
              maxScore: 30,
              levels: [
                { score: 30, description: 'Excellent use of relevant evidence' },
                { score: 24, description: 'Good use of evidence' },
                { score: 18, description: 'Adequate evidence' },
                { score: 12, description: 'Limited evidence' },
                { score: 0, description: 'No supporting evidence' },
              ],
            },
          ],
        }),
      ]);

      // Act - Query all available templates (simulating template discovery)
      const allTemplates = await db.rubric.findMany({
        where: { isTemplate: true },
        include: { user: true },
        orderBy: { name: 'asc' },
      });

      // Assert - All templates should be discoverable
      expect(allTemplates).toHaveLength(3);

      // Verify template diversity
      const templateNames = allTemplates.map((t) => t.name);
      expect(templateNames).toContain('Mathematics Problem Solving Template');
      expect(templateNames).toContain('Scientific Report Template');
      expect(templateNames).toContain('Literary Analysis Template');

      // Verify teacher association
      const teacherEmails = allTemplates.map((t) => t.user.email);
      expect(teacherEmails).toContain('prof.math@university.edu');
      expect(teacherEmails).toContain('prof.science@university.edu');
      expect(teacherEmails).toContain('prof.english@university.edu');

      // Verify each template has criteria
      allTemplates.forEach((template) => {
        expect(Array.isArray(template.criteria)).toBe(true);
        expect(template.criteria.length).toBeGreaterThan(0);
      });

      console.log('✅ Template discovery test passed');
      console.log(`   • Total discoverable templates: ${allTemplates.length}`);
      console.log(`   • Disciplines: Math, Science, English`);
      console.log(`   • Template creators: ${new Set(teacherEmails).size} different teachers`);
    });

    it('should maintain template integrity when used by multiple teachers', async () => {
      // Arrange - Teacher creates a template
      const originalTeacher = await UserFactory.createTeacher({
        name: 'Prof. Original',
        email: 'prof.original@university.edu',
      });

      const sharedTemplate = await RubricFactory.create({
        userId: originalTeacher.id,
        name: 'Shared Presentation Template',
        description: 'Template for presentation assessments - shared across department',
        isTemplate: true,
        criteria: [
          {
            id: uuidv4(),
            name: 'Content Knowledge',
            description: 'Demonstration of subject matter expertise',
            maxScore: 40,
            levels: [
              { score: 40, description: 'Expert-level knowledge demonstrated' },
              { score: 30, description: 'Strong knowledge with minor gaps' },
              { score: 20, description: 'Adequate knowledge' },
              { score: 10, description: 'Limited knowledge' },
              { score: 0, description: 'Insufficient knowledge' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Presentation Skills',
            description: 'Delivery, organization, and audience engagement',
            maxScore: 35,
            levels: [
              { score: 35, description: 'Excellent presentation skills' },
              { score: 28, description: 'Good presentation skills' },
              { score: 21, description: 'Adequate presentation' },
              { score: 14, description: 'Poor presentation skills' },
              { score: 0, description: 'Very poor presentation' },
            ],
          },
        ],
      });

      // Create other teachers who want to use the template
      const userTeachers = await Promise.all([
        UserFactory.createTeacher({
          name: 'Prof. User1',
          email: 'prof.user1@university.edu',
        }),
        UserFactory.createTeacher({
          name: 'Prof. User2',
          email: 'prof.user2@university.edu',
        }),
      ]);

      // Create courses for each teacher
      const courses = await Promise.all([
        CourseFactory.createWithInvitation(userTeachers[0].id, {
          name: 'Biology Presentations',
          description: 'Student presentation course in biology',
        }),
        CourseFactory.createWithInvitation(userTeachers[1].id, {
          name: 'History Symposium',
          description: 'Historical research presentations',
        }),
      ]);

      // Act - Multiple teachers use the same template
      const assignments = await Promise.all([
        AssignmentAreaFactory.create({
          courseId: courses[0].course.id,
          rubricId: sharedTemplate.id,
          name: 'Cell Biology Presentation',
          description: 'Present research on cellular processes',
        }),
        AssignmentAreaFactory.create({
          courseId: courses[1].course.id,
          rubricId: sharedTemplate.id,
          name: 'Historical Analysis Presentation',
          description: 'Present analysis of historical events',
        }),
      ]);

      // Assert - Template should remain unchanged despite multiple uses
      const templateAfterUse = await db.rubric.findUnique({
        where: { id: sharedTemplate.id },
        include: {
          assignmentAreas: {
            include: {
              course: {
                include: { teacher: true },
              },
            },
          },
        },
      });

      // Verify template integrity
      expect(templateAfterUse!.name).toBe('Shared Presentation Template');
      expect(templateAfterUse!.userId).toBe(originalTeacher.id); // Owner unchanged
      expect(templateAfterUse!.isTemplate).toBe(true);
      expect(templateAfterUse!.criteria).toHaveLength(2);

      // Verify usage across multiple teachers
      expect(templateAfterUse!.assignmentAreas).toHaveLength(2);

      const usingTeachers = templateAfterUse!.assignmentAreas.map((a) => a.course.teacher.email);
      expect(usingTeachers).toContain('prof.user1@university.edu');
      expect(usingTeachers).toContain('prof.user2@university.edu');
      expect(usingTeachers).not.toContain('prof.original@university.edu'); // Original teacher not using it in these assignments

      // Verify template criteria integrity - check we have 2 criteria
      expect(templateAfterUse!.criteria).toHaveLength(2);

      console.log('✅ Template integrity across multiple users test passed');
      console.log(`   • Template owner: ${originalTeacher.email}`);
      console.log(`   • Users: ${usingTeachers.join(', ')}`);
      console.log(`   • Total usage: ${templateAfterUse!.assignmentAreas.length} assignments`);
      console.log(`   • Template criteria preserved: ${templateAfterUse!.criteria.length}`);
    });
  });
});
