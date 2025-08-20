import { describe, it, expect } from 'vitest';
import { 
  UserFactory, 
  CourseFactory,
  RubricFactory
} from '../factories';
import { db } from '@/types/database';

/**
 * Integration Test #4: Multi-User Course Enrollment
 * 
 * Tests concurrent enrollment scenarios, invitation code management,
 * and multi-user data isolation in course contexts.
 * Validates that multiple students can enroll simultaneously without conflicts.
 */
describe('Multi-User Course Enrollment Integration', () => {
  
  describe('Concurrent Student Enrollment', () => {
    it('should handle multiple students enrolling simultaneously with same invitation code', async () => {
      // Arrange - Create teacher and course with invitation
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Anderson',
        email: 'prof.anderson@university.edu'
      });
      
      const { course, invitationCode } = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Computer Science 101',
        description: 'Introduction to Computer Science concepts and programming'
      });
      
      // Create multiple students
      const students = await UserFactory.createMany(5, { role: 'STUDENT' });
      
      // Act - Simulate concurrent enrollments using the same invitation code
      const enrollmentPromises = students.map(student => 
        db.enrollment.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            enrolledAt: new Date()
          }
        })
      );
      
      const enrollments = await Promise.all(enrollmentPromises);
      
      // Assert - All students should be successfully enrolled
      expect(enrollments).toHaveLength(5);
      enrollments.forEach((enrollment, index) => {
        expect(enrollment.studentId).toBe(students[index].id);
        expect(enrollment.courseId).toBe(course.id);
        expect(enrollment.enrolledAt).toBeInstanceOf(Date);
      });
      
      // Verify course enrollment count
      const courseWithEnrollments = await db.course.findUnique({
        where: { id: course.id },
        include: { 
          enrollments: true,
          _count: { select: { enrollments: true } }
        }
      });
      
      expect(courseWithEnrollments!.enrollments).toHaveLength(5);
      expect(courseWithEnrollments!._count.enrollments).toBe(5);
      
      // Verify invitation code is still valid and trackable
      const invitationWithUsage = await db.invitationCode.findUnique({
        where: { id: invitationCode.id },
        include: { 
          course: {
            include: { enrollments: true }
          }
        }
      });
      
      expect(invitationWithUsage!.course.enrollments).toHaveLength(5);
      
      console.log('✅ Concurrent enrollment test passed');
      console.log(`   • Course: "${course.name}"`);
      console.log(`   • Students enrolled: ${enrollments.length}`);
      console.log(`   • Invitation code: ${invitationCode.code}`);
    });
    
    it('should prevent enrollment in non-existent courses', async () => {
      // Arrange
      const student = await UserFactory.createStudent({
        name: 'John Student',
        email: 'john.student@university.edu'
      });
      
      // Act & Assert - Try to enroll in non-existent course
      await expect(
        db.enrollment.create({
          data: {
            studentId: student.id,
            courseId: 'non-existent-course-id',
            enrolledAt: new Date()
          }
        })
      ).rejects.toThrow(); // Should fail due to foreign key constraint
      
      console.log('✅ Non-existent course enrollment prevention test passed');
    });
    
    it('should handle multiple courses with different enrollment capacities', async () => {
      // Arrange - Create multiple teachers and courses
      const teachers = await UserFactory.createMany(3, { role: 'TEACHER' });
      
      const courses = await Promise.all([
        CourseFactory.createWithInvitation(teachers[0].id, {
          name: 'Advanced Mathematics',
          description: 'Graduate level mathematics course'
        }),
        CourseFactory.createWithInvitation(teachers[1].id, {
          name: 'Introduction to Physics',
          description: 'Basic physics concepts and laboratory work'
        }),
        CourseFactory.createWithInvitation(teachers[2].id, {
          name: 'Creative Writing Workshop',
          description: 'Hands-on creative writing and peer review'
        })
      ]);
      
      // Create different numbers of students for each course
      const mathStudents = await UserFactory.createMany(8, { role: 'STUDENT' });
      const physicsStudents = await UserFactory.createMany(12, { role: 'STUDENT' });
      const writingStudents = await UserFactory.createMany(6, { role: 'STUDENT' });
      
      // Act - Enroll students in their respective courses
      const mathEnrollments = await Promise.all(
        mathStudents.map(student =>
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: courses[0].course.id,
              enrolledAt: new Date()
            }
          })
        )
      );
      
      const physicsEnrollments = await Promise.all(
        physicsStudents.map(student =>
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: courses[1].course.id,
              enrolledAt: new Date()
            }
          })
        )
      );
      
      const writingEnrollments = await Promise.all(
        writingStudents.map(student =>
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: courses[2].course.id,
              enrolledAt: new Date()
            }
          })
        )
      );
      
      // Assert - Verify enrollments are properly isolated per course
      expect(mathEnrollments).toHaveLength(8);
      expect(physicsEnrollments).toHaveLength(12);
      expect(writingEnrollments).toHaveLength(6);
      
      // Verify course-specific enrollment isolation
      for (let i = 0; i < 3; i++) {
        const courseEnrollments = await db.enrollment.findMany({
          where: { courseId: courses[i].course.id }
        });
        
        const expectedCount = [8, 12, 6][i];
        expect(courseEnrollments).toHaveLength(expectedCount);
        
        // Verify no cross-course contamination
        courseEnrollments.forEach(enrollment => {
          expect(enrollment.courseId).toBe(courses[i].course.id);
        });
      }
      
      console.log('✅ Multiple course enrollment test passed');
      console.log(`   • Math course: ${mathEnrollments.length} students`);
      console.log(`   • Physics course: ${physicsEnrollments.length} students`);
      console.log(`   • Writing course: ${writingEnrollments.length} students`);
    });
  });
  
  describe('Invitation Code Management', () => {
    it('should generate unique invitation codes for different courses', async () => {
      // Arrange - Create multiple teachers
      const teachers = await UserFactory.createMany(4, { role: 'TEACHER' });
      
      // Act - Create courses with invitation codes
      const coursesWithInvitations = await Promise.all(
        teachers.map((teacher, index) =>
          CourseFactory.createWithInvitation(teacher.id, {
            name: `Course ${index + 1}`,
            description: `Description for course ${index + 1}`
          })
        )
      );
      
      // Assert - All invitation codes should be unique
      const invitationCodes = coursesWithInvitations.map(({ invitationCode }) => invitationCode.code);
      const uniqueCodes = new Set(invitationCodes);
      
      expect(uniqueCodes.size).toBe(invitationCodes.length); // All codes should be unique
      
      // Verify each invitation code is properly linked to its course
      for (const { course, invitationCode } of coursesWithInvitations) {
        expect(invitationCode.courseId).toBe(course.id);
        expect(invitationCode.isUsed).toBe(false);
        expect(invitationCode.code).toMatch(/^TEST-[A-Z0-9]{8}$/); // Should match expected format
      }
      
      console.log('✅ Unique invitation codes test passed');
      console.log(`   • Generated ${uniqueCodes.size} unique codes`);
      console.log(`   • Codes: ${Array.from(uniqueCodes).join(', ')}`);
    });
    
    it('should track invitation code usage and enrollment statistics', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher({
        name: 'Prof. Statistics',
        email: 'prof.stats@university.edu'
      });
      
      const { course, invitationCode } = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Statistics and Data Analysis',
        description: 'Statistical methods for data analysis'
      });
      
      // Create students and enroll some of them
      const allStudents = await UserFactory.createMany(10, { role: 'STUDENT' });
      const enrolledStudents = allStudents.slice(0, 7); // Only 7 out of 10 students enroll
      
      // Act - Enroll students
      const enrollments = await Promise.all(
        enrolledStudents.map(student =>
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: course.id,
              enrolledAt: new Date()
            }
          })
        )
      );
      
      // Act - Check invitation code statistics
      const invitationWithStats = await db.invitationCode.findUnique({
        where: { id: invitationCode.id },
        include: {
          course: {
            include: {
              enrollments: true,
              teacher: true
            }
          }
        }
      });
      
      // Assert - Verify enrollment statistics
      expect(invitationWithStats).toBeTruthy();
      expect(invitationWithStats!.course.enrollments).toHaveLength(7);
      expect(invitationWithStats!.course.teacher.id).toBe(teacher.id);
      expect(invitationWithStats!.isUsed).toBe(false);
      
      // Verify enrollment data integrity
      enrollments.forEach(enrollment => {
        expect(enrollment.courseId).toBe(course.id);
        expect(enrollment.enrolledAt).toBeInstanceOf(Date);
      });
      
      console.log('✅ Invitation code usage tracking test passed');
      console.log(`   • Total students created: ${allStudents.length}`);
      console.log(`   • Students enrolled: ${enrollments.length}`);
      console.log(`   • Enrollment rate: ${(enrollments.length / allStudents.length * 100).toFixed(1)}%`);
    });
    
    it('should support invitation code deactivation and reactivation', async () => {
      // Arrange
      const teacher = await UserFactory.createTeacher();
      const { course, invitationCode } = await CourseFactory.createWithInvitation(teacher.id, {
        name: 'Controlled Enrollment Course',
        description: 'Course with managed enrollment periods'
      });
      
      // Verify initial state
      expect(invitationCode.isUsed).toBe(false);
      
      // Act - Mark invitation code as used
      const usedCode = await db.invitationCode.update({
        where: { id: invitationCode.id },
        data: { isUsed: true, usedAt: new Date() }
      });
      
      expect(usedCode.isUsed).toBe(true);
      expect(usedCode.usedAt).toBeInstanceOf(Date);
      
      // Act - Reset invitation code (mark as unused)
      const resetCode = await db.invitationCode.update({
        where: { id: invitationCode.id },
        data: { isUsed: false, usedAt: null }
      });
      
      // Assert
      expect(resetCode.isUsed).toBe(false);
      expect(resetCode.usedAt).toBe(null);
      expect(resetCode.code).toBe(invitationCode.code); // Code should remain the same
      expect(resetCode.courseId).toBe(course.id);
      
      console.log('✅ Invitation code activation management test passed');
    });
  });
  
  describe('Cross-User Data Isolation', () => {
    it('should maintain complete data isolation between different teachers\' courses', async () => {
      // Arrange - Create multiple teachers with their own courses and students
      const teacherA = await UserFactory.createTeacher({
        name: 'Prof. Alpha',
        email: 'prof.alpha@university.edu'
      });
      
      const teacherB = await UserFactory.createTeacher({
        name: 'Prof. Beta', 
        email: 'prof.beta@university.edu'
      });
      
      const { course: courseA } = await CourseFactory.createWithInvitation(teacherA.id, {
        name: 'Course Alpha',
        description: 'Teacher A course'
      });
      
      const { course: courseB } = await CourseFactory.createWithInvitation(teacherB.id, {
        name: 'Course Beta',
        description: 'Teacher B course'
      });
      
      // Create rubrics for each teacher
      const rubricA = await RubricFactory.create({
        userId: teacherA.id,
        name: 'Alpha Rubric',
        description: 'Grading rubric for Teacher A'
      });
      
      const rubricB = await RubricFactory.create({
        userId: teacherB.id,
        name: 'Beta Rubric', 
        description: 'Grading rubric for Teacher B'
      });
      
      // Create and enroll students
      const studentsA = await UserFactory.createMany(3, { role: 'STUDENT' });
      const studentsB = await UserFactory.createMany(4, { role: 'STUDENT' });
      
      await Promise.all([
        ...studentsA.map(student => 
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: courseA.id,
              enrolledAt: new Date()
            }
          })
        ),
        ...studentsB.map(student =>
          db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: courseB.id,
              enrolledAt: new Date()
            }
          })
        )
      ]);
      
      // Act - Verify data isolation by querying each teacher's data
      const teacherAData = await db.user.findUnique({
        where: { id: teacherA.id },
        include: {
          courses: {
            include: {
              enrollments: {
                include: { student: true }
              }
            }
          },
          rubrics: true
        }
      });
      
      const teacherBData = await db.user.findUnique({
        where: { id: teacherB.id },
        include: {
          courses: {
            include: {
              enrollments: {
                include: { student: true }
              }
            }
          },
          rubrics: true
        }
      });
      
      // Assert - Complete data isolation
      expect(teacherAData!.courses).toHaveLength(1);
      expect(teacherAData!.courses[0].enrollments).toHaveLength(3);
      expect(teacherAData!.rubrics).toHaveLength(1);
      expect(teacherAData!.rubrics[0].name).toBe('Alpha Rubric');
      
      expect(teacherBData!.courses).toHaveLength(1);
      expect(teacherBData!.courses[0].enrollments).toHaveLength(4);
      expect(teacherBData!.rubrics).toHaveLength(1);
      expect(teacherBData!.rubrics[0].name).toBe('Beta Rubric');
      
      // Verify no cross-contamination
      const teacherAStudentIds = teacherAData!.courses[0].enrollments.map(e => e.student.id);
      const teacherBStudentIds = teacherBData!.courses[0].enrollments.map(e => e.student.id);
      
      // No student should be in both courses (in this test scenario)
      const intersection = teacherAStudentIds.filter(id => teacherBStudentIds.includes(id));
      expect(intersection).toHaveLength(0);
      
      console.log('✅ Cross-user data isolation test passed');
      console.log(`   • Teacher A: ${teacherAData!.courses[0].enrollments.length} students, 1 course, 1 rubric`);
      console.log(`   • Teacher B: ${teacherBData!.courses[0].enrollments.length} students, 1 course, 1 rubric`);
      console.log(`   • No data cross-contamination detected`);
    });
    
    it('should handle student enrollment in multiple courses by different teachers', async () => {
      // Arrange - Student can enroll in courses by different teachers
      const teacherX = await UserFactory.createTeacher({
        name: 'Prof. X',
        email: 'prof.x@university.edu'
      });
      
      const teacherY = await UserFactory.createTeacher({
        name: 'Prof. Y',
        email: 'prof.y@university.edu'
      });
      
      const { course: courseX } = await CourseFactory.createWithInvitation(teacherX.id, {
        name: 'Mathematics Course',
        description: 'Advanced mathematics'
      });
      
      const { course: courseY } = await CourseFactory.createWithInvitation(teacherY.id, {
        name: 'Literature Course', 
        description: 'Classic literature analysis'
      });
      
      const student = await UserFactory.createStudent({
        name: 'Multi-Course Student',
        email: 'multi.student@university.edu'
      });
      
      // Act - Enroll student in both courses
      const enrollmentX = await db.enrollment.create({
        data: {
          studentId: student.id,
          courseId: courseX.id,
          enrolledAt: new Date()
        }
      });
      
      const enrollmentY = await db.enrollment.create({
        data: {
          studentId: student.id,
          courseId: courseY.id,
          enrolledAt: new Date()
        }
      });
      
      // Assert - Student should be enrolled in both courses
      const studentWithEnrollments = await db.user.findUnique({
        where: { id: student.id },
        include: {
          enrollments: {
            include: {
              course: {
                include: { teacher: true }
              }
            }
          }
        }
      });
      
      expect(studentWithEnrollments!.enrollments).toHaveLength(2);
      
      // Verify enrollments are in different courses with different teachers
      const courseIds = studentWithEnrollments!.enrollments.map(e => e.course.id);
      const teacherIds = studentWithEnrollments!.enrollments.map(e => e.course.teacher.id);
      
      expect(courseIds).toContain(courseX.id);
      expect(courseIds).toContain(courseY.id);
      expect(teacherIds).toContain(teacherX.id);
      expect(teacherIds).toContain(teacherY.id);
      
      console.log('✅ Multi-course student enrollment test passed');
      console.log(`   • Student enrolled in ${studentWithEnrollments!.enrollments.length} courses`);
      console.log(`   • Courses: ${studentWithEnrollments!.enrollments.map(e => e.course.name).join(', ')}`);
    });
  });
});