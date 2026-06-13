import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import type { AssignmentAreaInfo } from './assignment-area.server';
import type { CourseSearchResult } from '@/contracts/search-api';

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

    logger.info({ courseName: course.name, teacherId }, '  Created course');
    return course;
  } catch (error) {
    logger.error({ err: error }, '❌ Error creating course:');
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
    logger.error({ err: error }, '❌ Error fetching teacher courses:');
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
    logger.error({ err: error }, '❌ Error fetching course:');
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
export async function updateCourse(
  courseId: string,
  teacherId: string,
  updateData: Partial<CreateCourseData>
): Promise<CourseInfo | null> {
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
    logger.error({ err: error }, '❌ Error updating course:');
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
      logger.info({ data: courseId }, 'Deleted course:');
    }

    return success;
  } catch (error) {
    logger.error({ err: error }, 'Error deleting course:');
    return false;
  }
}

/**
 * Format Prisma course results to SearchResponse format
 */
function formatCourseResults(
  courses: Array<{
    id: string;
    name: string;
    description: string | null;
    teacherId: string;
    teacher: { name: string };
    classes: Array<{
      _count: { enrollments: number };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>
): CourseSearchResult[] {
  return courses.map((course) => {
    // Calculate total enrollment count across all classes
    const totalEnrollment = course.classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);

    return {
      id: course.id,
      title: course.name, // Map name to title for API response
      description: course.description,
      instructorId: course.teacherId, // Map teacherId to instructorId
      instructorName: course.teacher.name,
      enrollmentCount: totalEnrollment,
      status: 'ACTIVE' as const,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  });
}
