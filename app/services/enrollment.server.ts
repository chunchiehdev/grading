import { db } from '@/lib/db.server';

export interface EnrollmentInfo {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  student: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
  course: {
    id: string;
    name: string;
    description: string | null;
    teacher: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export interface CourseWithEnrollmentInfo {
  id: string;
  name: string;
  description: string | null;
  teacher: {
    id: string;
    email: string;
    name: string;
  };
  _count: {
    enrollments: number;
    assignmentAreas: number;
  };
  enrolledAt?: Date;
}

/**
 * Enrolls a student in a course
 * @param studentId - Student's user ID
 * @param courseId - Course ID
 * @returns Created enrollment information
 */
export async function enrollStudent(studentId: string, courseId: string): Promise<EnrollmentInfo> {
  try {
    // Check if already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this course');
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Create enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        courseId,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true,
          },
        },
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log('✅ Student enrolled:', studentId, 'in course:', courseId);
    return enrollment;
  } catch (error) {
    console.error('❌ Error enrolling student:', error);
    throw error;
  }
}

/**
 * Checks if a student is enrolled in a course
 * @param studentId - Student's user ID
 * @param courseId - Course ID
 * @returns True if enrolled, false otherwise
 */
export async function isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    return !!enrollment;
  } catch (error) {
    console.error('❌ Error checking enrollment:', error);
    return false;
  }
}

/**
 * Gets all courses a student is enrolled in
 * @param studentId - Student's user ID
 * @returns List of enrolled courses with enrollment info
 */
export async function getStudentEnrolledCourses(studentId: string): Promise<CourseWithEnrollmentInfo[]> {
  try {
    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                assignmentAreas: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((enrollment: any) => ({
      ...enrollment.course,
      enrolledAt: enrollment.enrolledAt,
    }));
  } catch (error) {
    console.error('❌ Error fetching student enrolled courses:', error);
    return [];
  }
}

/**
 * Gets all students enrolled in a course (for teachers)
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of enrolled students
 */
export async function getCourseEnrollments(courseId: string, teacherId: string): Promise<EnrollmentInfo[]> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    const enrollments = await db.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true,
          },
        },
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  } catch (error) {
    console.error('❌ Error fetching course enrollments:', error);
    throw error;
  }
}

/**
 * Removes a student from a course
 * @param studentId - Student's user ID
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization (optional, for teacher-initiated removal)
 * @returns True if removed successfully
 */
export async function unenrollStudent(studentId: string, courseId: string, teacherId?: string): Promise<boolean> {
  try {
    // If teacherId provided, verify they own the course
    if (teacherId) {
      const course = await db.course.findFirst({
        where: {
          id: courseId,
          teacherId,
        },
      });

      if (!course) {
        throw new Error('Course not found or unauthorized');
      }
    }

    const result = await db.enrollment.deleteMany({
      where: {
        studentId,
        courseId,
      },
    });

    console.log('✅ Student unenrolled:', studentId, 'from course:', courseId);
    return result.count > 0;
  } catch (error) {
    console.error('❌ Error unenrolling student:', error);
    return false;
  }
}

/**
 * Gets enrollment statistics for a course
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Enrollment statistics
 */
export async function getCourseEnrollmentStats(courseId: string, teacherId: string) {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    const stats = await db.enrollment.aggregate({
      where: { courseId },
      _count: true,
    });

    const recentEnrollments = await db.enrollment.findMany({
      where: { courseId },
      select: {
        enrolledAt: true,
        student: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
      take: 5,
    });

    return {
      totalEnrollments: stats._count,
      recentEnrollments,
    };
  } catch (error) {
    console.error('❌ Error fetching enrollment stats:', error);
    return {
      totalEnrollments: 0,
      recentEnrollments: [],
    };
  }
}
