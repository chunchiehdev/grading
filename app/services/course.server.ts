import { db } from '@/lib/db.server';
import type { AssignmentAreaInfo } from './assignment-area.server';

export interface CourseInfo {
  id: string;
  name: string;
  description: string | null;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  assignmentAreas?: AssignmentAreaInfo[];
}


export interface CreateCourseData {
  name: string;
  description?: string;
}


/**
 * Creates a new course for a teacher
 * @param {string} teacherId - The teacher's user ID
 * @param {CreateCourseData} courseData - Course creation data
 * @returns {Promise<CourseInfo>} Created course information
 */
export async function createCourse(teacherId: string, courseData: CreateCourseData): Promise<CourseInfo> {
  try {
    const course = await db.course.create({
      data: {
        name: courseData.name,
        description: courseData.description || null,
        teacherId,
      },
    });

    console.log('✅ Created course:', course.name, 'for teacher:', teacherId);
    return course;
  } catch (error) {
    console.error('❌ Error creating course:', error);
    throw new Error('Failed to create course');
  }
}

/**
 * Gets all courses for a teacher
 * @param {string} teacherId - The teacher's user ID
 * @returns {Promise<CourseInfo[]>} List of teacher's courses
 */
export async function getTeacherCourses(teacherId: string): Promise<CourseInfo[]> {
  try {
    const courses = await db.course.findMany({
      where: { teacherId },
      include: {
        assignmentAreas: {
          include: {
            rubric: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            _count: {
              select: {
                submissions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses;
  } catch (error) {
    console.error('❌ Error fetching teacher courses:', error);
    return [];
  }
}

/**
 * Gets a specific course with details (teacher authorization required)
 * @param {string} courseId - Course ID
 * @param {string} teacherId - Teacher's user ID for authorization
 * @returns {Promise<CourseInfo | null>} Course information or null if not found/unauthorized
 */
export async function getCourseById(courseId: string, teacherId: string): Promise<CourseInfo | null> {
  try {
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId, // Ensure teacher owns this course
      },
      include: {
        assignmentAreas: {
          include: {
            rubric: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            _count: {
              select: {
                submissions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return course;
  } catch (error) {
    console.error('❌ Error fetching course:', error);
    return null;
  }
}

/**
 * Creates an assignment area within a course
 * @param {string} teacherId - Teacher's user ID for authorization
 * @param {CreateAssignmentAreaData} assignmentData - Assignment area creation data
 * @returns {Promise<AssignmentAreaInfo>} Created assignment area information
 */

/**
 * Updates a course (teacher authorization required)
 * @param {string} courseId - Course ID
 * @param {string} teacherId - Teacher's user ID for authorization
 * @param {Partial<CreateCourseData>} updateData - Course update data
 * @returns {Promise<CourseInfo | null>} Updated course information
 */
export async function updateCourse(courseId: string, teacherId: string, updateData: Partial<CreateCourseData>): Promise<CourseInfo | null> {
  try {
    const course = await db.course.updateMany({
      where: {
        id: courseId,
        teacherId, // Ensure teacher owns this course
      },
      data: updateData,
    });

    if (course.count === 0) {
      return null; // Course not found or unauthorized
    }

    // Return updated course
    return getCourseById(courseId, teacherId);
  } catch (error) {
    console.error('❌ Error updating course:', error);
    return null;
  }
}

/**
 * Deletes a course (teacher authorization required)
 * @param {string} courseId - Course ID
 * @param {string} teacherId - Teacher's user ID for authorization
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteCourse(courseId: string, teacherId: string): Promise<boolean> {
  try {
    const result = await db.course.deleteMany({
      where: {
        id: courseId,
        teacherId,
      },
    });

    const success = result.count > 0;
    if (success) {
      console.log('Deleted course:', courseId);
    }

    return success;
  } catch (error) {
    console.error('Error deleting course:', error);
    return false;
  }
}

/**
 * Returns list of students enrolled in a course (teacher authorization required)
 */
export async function getEnrolledStudents(courseId: string, teacherId: string) {
  const { getCourseStudents } = await import('./enrollment.server');
  const enrollments = await getCourseStudents(courseId, teacherId);
  return enrollments.map((e) => e.student);
}

/**
 * Removes a student from all classes in a course (teacher authorization required)
 */
export async function removeStudentFromCourse(courseId: string, studentId: string, teacherId: string) {
  const { unenrollStudent } = await import('./enrollment.server');
  return unenrollStudent(studentId, courseId, teacherId);
}
