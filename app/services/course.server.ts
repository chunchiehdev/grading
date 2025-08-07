import { db } from '@/lib/db.server';

export interface CourseInfo {
  id: string;
  name: string;
  description: string | null;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  assignmentAreas?: AssignmentAreaInfo[];
}

export interface AssignmentAreaInfo {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  rubricId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rubric: {
    id: string;
    name: string;
    description: string;
  };
  _count?: {
    submissions: number;
  };
}

export interface CreateCourseData {
  name: string;
  description?: string;
}

export interface CreateAssignmentAreaData {
  name: string;
  description?: string;
  courseId: string;
  rubricId: string;
  dueDate?: string; // ISO string
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
export async function createAssignmentArea(teacherId: string, assignmentData: CreateAssignmentAreaData): Promise<AssignmentAreaInfo> {
  try {
    // First verify the teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: assignmentData.courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Verify the rubric exists and belongs to the teacher
    const rubric = await db.rubric.findFirst({
      where: {
        id: assignmentData.rubricId,
        OR: [
          { userId: teacherId },
          { teacherId: teacherId },
        ],
      },
    });

    if (!rubric) {
      throw new Error('Rubric not found or unauthorized');
    }

    const assignmentArea = await db.assignmentArea.create({
      data: {
        name: assignmentData.name,
        description: assignmentData.description || null,
        courseId: assignmentData.courseId,
        rubricId: assignmentData.rubricId,
        dueDate: assignmentData.dueDate ? new Date(assignmentData.dueDate) : null,
      },
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
    });

    console.log('✅ Created assignment area:', assignmentArea.name, 'in course:', course.name);
    return assignmentArea;
  } catch (error) {
    console.error('❌ Error creating assignment area:', error);
    throw error;
  }
}

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
        teacherId, // Ensure teacher owns this course
      },
    });

    const success = result.count > 0;
    if (success) {
      console.log('✅ Deleted course:', courseId);
    }
    return success;
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    return false;
  }
} 