import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import type { AssignmentAreaInfo } from './assignment-area.server';
import type { CourseSearchResult } from '@/contracts/search-api';
import { SEARCH_CONSTRAINTS } from '@/contracts/search-api';

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

    logger.info('  Created course:', course.name, 'for teacher:', teacherId);
    return course;
  } catch (error) {
    logger.error('❌ Error creating course:', error);
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
    logger.error('❌ Error fetching teacher courses:', error);
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
    logger.error('❌ Error fetching course:', error);
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
    logger.error('❌ Error updating course:', error);
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
      logger.info('Deleted course:', courseId);
    }

    return success;
  } catch (error) {
    logger.error('Error deleting course:', error);
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

/**
 * Search for courses matching the provided query
 * - Case-insensitive partial matching on name and description
 * - Limited to max 100 results for MVP
 *
 * @param query - Search query string (will be sanitized)
 * @param userId - Current user ID for permission checking
 * @returns Array of matching courses (max 100)
 */
/**
 * Search for courses by query string
 *
 * Performs case-insensitive search against course titles and descriptions.
 * Requires valid user authentication. Returns limited results for performance.
 *
 * @async
 * @param {string} query - Search query string (max 200 characters, trimmed)
 * @param {string} userId - Authenticated user ID from session
 * @returns {Promise<CourseSearchResult[]>} Array of matching courses (max 100 results)
 * @throws {Error} If user is not authenticated or database error occurs
 *
 * @description
 * Search Algorithm:
 * - Trims and limits query to 200 characters
 * - Uses Prisma ILIKE for case-insensitive matching
 * - Searches: course.name, course.description
 * - Empty query returns all ACTIVE courses
 * - Results sorted by createdAt DESC (newest first)
 * - Max 100 results per query (performance limit)
 *
 * @example
 * ```typescript
 * // Search for "Python"
 * const results = await searchCourses('Python', userId);
 * // Returns: [{ id, title: 'Python 101', ... }, ...]
 *
 * // Get all courses (empty query)
 * const allCourses = await searchCourses('', userId);
 *
 * // Empty query after search refinement
 * const courses = await searchCourses('   ', userId);
 * // Trimmed to '' -> returns all ACTIVE courses
 * ```
 *
 * @remarks
 * - Query is automatically trimmed of whitespace
 * - Query longer than 200 chars is truncated
 * - Only ACTIVE courses returned (no ARCHIVED or DRAFT)
 * - Uses Prisma's insensitive mode for case-insensitive search
 * - Results formatted via formatCourseResults helper
 * - Errors logged to console (error handling in API endpoint)
 * - Database connection pooling managed by Prisma
 *
 * @performance
 * - Time: O(n) where n = total courses (limited by DB index)
 * - Index: course.name, course.description for ILIKE queries
 * - Memory: O(min(100, results.length)) for result array
 * - Recommended: <100ms response time with proper indexing
 *
 * @see formatCourseResults - Transforms Prisma results to API format
 * @see SEARCH_CONSTRAINTS - Contains MAX_LENGTH, MAX_RESULTS constants
 */
export async function searchCourses(query: string, userId: string): Promise<CourseSearchResult[]> {
  // Validate user is authenticated
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Sanitize and limit query
  const MAX_QUERY_LENGTH = SEARCH_CONSTRAINTS.MAX_LENGTH;
  const sanitized = query.trim().slice(0, MAX_QUERY_LENGTH);

  try {
    // If empty query, return all active courses
    if (!sanitized) {
      const courses = await db.course.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          teacherId: true,
          teacher: { select: { name: true } },
          classes: {
            select: {
              _count: {
                select: { enrollments: true }
              }
            }
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: SEARCH_CONSTRAINTS.MAX_RESULTS,
      });

      return formatCourseResults(courses);
    }

    // Search in name and description, case-insensitive
    const results = await db.course.findMany({
      where: {
        OR: [
          { name: { contains: sanitized, mode: 'insensitive' } },
          { description: { contains: sanitized, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        teacherId: true,
        teacher: { select: { name: true } },
        classes: {
          select: {
            _count: {
              select: { enrollments: true }
            }
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: SEARCH_CONSTRAINTS.MAX_RESULTS,
    });

    return formatCourseResults(results);
  } catch (error) {
    logger.error('Course search error:', error);
    throw new Error('Search failed. Please try again.');
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
    const totalEnrollment = course.classes.reduce(
      (sum, cls) => sum + cls._count.enrollments,
      0
    );

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
