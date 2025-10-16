import { db } from '@/lib/db.server';

/**
 * Enrollment information for a student in a class
 */
export interface EnrollmentInfo {
  id: string;
  studentId: string;
  classId: string;
  enrolledAt: Date;
  finalGrade: number | null;
  attendance: any | null;
  student: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
  class: {
    id: string;
    name: string;
    schedule: any | null;
    course: {
      id: string;
      name: string;
      code: string | null;
      description: string | null;
      teacher: {
        id: string;
        email: string;
        name: string;
      };
    };
  };
}

/**
 * Enrolls a student in a specific class
 * @param studentId - Student's user ID
 * @param classId - Class ID
 * @returns Created enrollment information
 */
export async function enrollStudentInClass(studentId: string, classId: string): Promise<EnrollmentInfo> {
  try {
    // Verify class exists and get course info
    const classInstance = await db.class.findUnique({
      where: { id: classId },
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
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!classInstance) {
      throw new Error('Class not found');
    }

    // Check capacity
    if (classInstance.capacity && classInstance._count.enrollments >= classInstance.capacity) {
      throw new Error('Class is full');
    }

    // Check if already enrolled in this class
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class');
    }

    // Create enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        classId,
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
        class: {
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
              },
            },
          },
        },
      },
    });

    console.log('✅ Student enrolled:', studentId, 'in class:', classId);
    return enrollment;
  } catch (error) {
    console.error('❌ Error enrolling student in class:', error);
    throw error;
  }
}

/**
 * Checks if a student is enrolled in a specific class
 * @param studentId - Student's user ID
 * @param classId - Class ID
 * @returns True if enrolled, false otherwise
 */
export async function isStudentEnrolledInClass(studentId: string, classId: string): Promise<boolean> {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    return !!enrollment;
  } catch (error) {
    console.error('❌ Error checking class enrollment:', error);
    return false;
  }
}

/**
 * Gets all enrollments for a specific class (for teachers)
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of enrolled students
 */
export async function getClassEnrollments(classId: string, teacherId: string): Promise<EnrollmentInfo[]> {
  try {
    // Verify teacher owns the class through course
    const classInstance = await db.class.findFirst({
      where: {
        id: classId,
        course: {
          teacherId,
        },
      },
    });

    if (!classInstance) {
      throw new Error('Class not found or unauthorized');
    }

    const enrollments = await db.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true,
          },
        },
        class: {
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
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  } catch (error) {
    console.error('❌ Error fetching class enrollments:', error);
    throw error;
  }
}

/**
 * Removes a student from a class
 * @param studentId - Student's user ID
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization (optional)
 * @returns True if removed successfully
 */
export async function unenrollStudentFromClass(
  studentId: string,
  classId: string,
  teacherId?: string
): Promise<boolean> {
  try {
    // If teacherId provided, verify they own the class through course
    if (teacherId) {
      const classInstance = await db.class.findFirst({
        where: {
          id: classId,
          course: {
            teacherId,
          },
        },
      });

      if (!classInstance) {
        throw new Error('Class not found or unauthorized');
      }
    }

    const result = await db.enrollment.delete({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    console.log('✅ Student unenrolled:', studentId, 'from class:', classId);
    return !!result;
  } catch (error) {
    console.error('❌ Error unenrolling student from class:', error);
    return false;
  }
}

/**
 * Gets all courses a student is enrolled in (via class enrollments)
 * @param studentId - Student's user ID
 * @returns List of courses with enrollment info grouped by course
 */
export async function getStudentEnrolledCourses(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                  },
                },
                _count: {
                  select: {
                    classes: true,
                    assignmentAreas: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Group by course and include class information
    const courseMap = new Map();
    enrollments.forEach((enrollment) => {
      const course = enrollment.class.course;
      if (!courseMap.has(course.id)) {
        courseMap.set(course.id, {
          ...course,
          enrolledAt: enrollment.enrolledAt,
          classes: [],
        });
      }
      courseMap.get(course.id).classes.push({
        id: enrollment.class.id,
        name: enrollment.class.name,
        schedule: enrollment.class.schedule,
        enrollmentId: enrollment.id,
      });
    });

    return Array.from(courseMap.values());
  } catch (error) {
    console.error('❌ Error fetching student enrolled courses:', error);
    return [];
  }
}

/**
 * Gets all students enrolled in any class of a course (for teachers)
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of enrolled students grouped by class
 */
export async function getCourseEnrollments(courseId: string, teacherId: string) {
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

    // Get all classes for this course
    const classes = await db.class.findMany({
      where: { courseId },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                name: true,
                picture: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    return classes.map((cls) => ({
      class: {
        id: cls.id,
        name: cls.name,
        schedule: cls.schedule,
        capacity: cls.capacity,
      },
      students: cls.enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        student: enrollment.student,
      })),
    }));
  } catch (error) {
    console.error('❌ Error fetching course enrollments:', error);
    throw error;
  }
}

/**
 * Gets a flat list of all students enrolled in a course (any class)
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Flat list of enrolled students with enrollment info
 */
export async function getCourseStudents(courseId: string, teacherId: string) {
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

    // Get all enrollments for classes in this course
    const enrollments = await db.enrollment.findMany({
      where: {
        class: {
          courseId,
        },
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
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  } catch (error) {
    console.error('❌ Error fetching course students:', error);
    throw error;
  }
}

/**
 * Removes a student from all classes in a course
 * @param studentId - Student's user ID
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns True if removed successfully
 */
export async function unenrollStudent(studentId: string, courseId: string, teacherId: string): Promise<boolean> {
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

    // Get all class IDs for this course
    const classes = await db.class.findMany({
      where: { courseId },
      select: { id: true },
    });

    const classIds = classes.map((c) => c.id);

    // Delete all enrollments for this student in these classes
    const result = await db.enrollment.deleteMany({
      where: {
        studentId,
        classId: {
          in: classIds,
        },
      },
    });

    console.log(`✅ Removed student ${studentId} from ${result.count} class(es) in course ${courseId}`);
    return result.count > 0;
  } catch (error) {
    console.error('❌ Error removing student from course:', error);
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

    // Get all classes for this course with enrollment counts
    const classes = await db.class.findMany({
      where: { courseId },
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
        enrollments: {
          include: {
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
        },
      },
    });

    const totalEnrollments = classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);
    const recentEnrollments = classes
      .flatMap((cls) =>
        cls.enrollments.map((enrollment) => ({
          enrolledAt: enrollment.enrolledAt,
          student: enrollment.student,
          className: cls.name,
        }))
      )
      .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime())
      .slice(0, 5);

    return {
      totalEnrollments,
      recentEnrollments,
      byClass: classes.map((cls) => ({
        classId: cls.id,
        className: cls.name,
        enrollmentCount: cls._count.enrollments,
      })),
    };
  } catch (error) {
    console.error('❌ Error fetching enrollment stats:', error);
    return {
      totalEnrollments: 0,
      recentEnrollments: [],
      byClass: [],
    };
  }
}
