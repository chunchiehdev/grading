import { db } from '@/lib/db.server';

/**
 * Class/Section Information Interface
 */
export interface ClassInfo {
  id: string;
  courseId: string;
  name: string;
  /**
   * Schedule data (JSON)
   *
   * New format (recommended):
   * {
   *   weekday: "一" | "二" | "三" | "四" | "五" | "六" | "日",
   *   periodCode: "1" | "2" | ... | "9" | "Z" | "A" | "B" | "C" | "D",
   *   room: string (optional)
   * }
   *
   * Legacy format (for backward compatibility):
   * {
   *   day: "星期一" | "星期二" | ...,
   *   startTime: "HH:mm",
   *   endTime: "HH:mm",
   *   room: string (optional)
   * }
   */
  schedule: any | null;
  capacity: number | null;
  assistantId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  course?: {
    id: string;
    name: string;
    code: string | null;
    teacher: {
      id: string;
      name: string;
      email: string;
    };
  };
  assistant?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    enrollments: number;
    assignmentAreas: number;
  };
}

/**
 * Data for creating a new class
 *
 * schedule should use the new format:
 * { weekday: string, periodCode: string, room?: string }
 */
export interface CreateClassData {
  courseId: string;
  name: string;
  schedule?: any;
  capacity?: number;
  assistantId?: string;
}

/**
 * Data for updating an existing class
 *
 * schedule should use the new format:
 * { weekday: string, periodCode: string, room?: string }
 */
export interface UpdateClassData {
  name?: string;
  schedule?: any;
  capacity?: number;
  assistantId?: string;
  isActive?: boolean;
}

/**
 * Creates a new class/section for a course
 * @param teacherId - Teacher's user ID for authorization
 * @param data - Class creation data
 * @returns Created class information
 */
export async function createClass(
  teacherId: string,
  data: CreateClassData
): Promise<ClassInfo> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: data.courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Verify assistant exists if provided
    if (data.assistantId) {
      const assistant = await db.user.findUnique({
        where: { id: data.assistantId },
      });

      if (!assistant) {
        throw new Error('Assistant user not found');
      }
    }

    const classInstance = await db.class.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        schedule: data.schedule || null,
        capacity: data.capacity || null,
        assistantId: data.assistantId || null,
        isActive: true,
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assistant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignmentAreas: true,
          },
        },
      },
    });

    console.log('✅ Created class:', classInstance.name, 'for course:', data.courseId);
    return classInstance;
  } catch (error) {
    console.error('❌ Error creating class:', error);
    throw error;
  }
}

/**
 * Gets a class by ID with teacher authorization
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Class information or null if not found/unauthorized
 */
export async function getClassById(
  classId: string,
  teacherId: string
): Promise<ClassInfo | null> {
  try {
    const classInstance = await db.class.findFirst({
      where: {
        id: classId,
        course: {
          teacherId,
        },
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assistant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignmentAreas: true,
          },
        },
      },
    });

    return classInstance;
  } catch (error) {
    console.error('❌ Error fetching class:', error);
    return null;
  }
}

/**
 * Lists all classes for a course with teacher authorization
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of classes with enrollment and assignment counts
 */
export async function listClassesByCourse(
  courseId: string,
  teacherId: string
): Promise<ClassInfo[]> {
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

    const classes = await db.class.findMany({
      where: { courseId },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assistant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignmentAreas: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return classes;
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    return [];
  }
}

/**
 * Updates a class with teacher authorization
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @param data - Update data
 * @returns Updated class or null if not found/unauthorized
 */
export async function updateClass(
  classId: string,
  teacherId: string,
  data: UpdateClassData
): Promise<ClassInfo | null> {
  try {
    // Verify teacher owns the class through course
    const existingClass = await getClassById(classId, teacherId);
    if (!existingClass) {
      return null;
    }

    // If assistant is being changed, verify they exist
    if (data.assistantId !== undefined && data.assistantId !== null) {
      const assistant = await db.user.findUnique({
        where: { id: data.assistantId },
      });

      if (!assistant) {
        throw new Error('Assistant user not found');
      }
    }

    const updatedClass = await db.class.update({
      where: { id: classId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.schedule !== undefined && { schedule: data.schedule }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.assistantId !== undefined && { assistantId: data.assistantId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assistant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignmentAreas: true,
          },
        },
      },
    });

    console.log('✅ Updated class:', updatedClass.name);
    return updatedClass;
  } catch (error) {
    console.error('❌ Error updating class:', error);
    throw error;
  }
}

/**
 * Deletes a class with teacher authorization
 * Note: This will cascade delete all enrollments and class-specific assignments
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns True if deleted successfully
 */
export async function deleteClass(
  classId: string,
  teacherId: string
): Promise<boolean> {
  try {
    // Verify teacher owns the class through course
    const existingClass = await getClassById(classId, teacherId);
    if (!existingClass) {
      return false;
    }

    // Check if this is the only class in the course
    const classCount = await db.class.count({
      where: { courseId: existingClass.courseId },
    });

    if (classCount <= 1) {
      throw new Error('Cannot delete the last class in a course');
    }

    await db.class.delete({
      where: { id: classId },
    });

    console.log('✅ Deleted class:', classId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting class:', error);
    throw error;
  }
}

/**
 * Gets class statistics
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Class statistics
 */
export async function getClassStatistics(classId: string, teacherId: string) {
  try {
    const classInstance = await getClassById(classId, teacherId);
    if (!classInstance) {
      throw new Error('Class not found or unauthorized');
    }

    const [
      totalEnrollments,
      totalAssignments,
      recentEnrollments,
      assignmentStats,
    ] = await Promise.all([
      db.enrollment.count({
        where: { classId },
      }),
      db.assignmentArea.count({
        where: { classId },
      }),
      db.enrollment.findMany({
        where: { classId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 10,
      }),
      db.submission.groupBy({
        by: ['status'],
        where: {
          assignmentArea: {
            classId,
          },
        },
        _count: true,
      }),
    ]);

    return {
      totalEnrollments,
      totalAssignments,
      recentEnrollments,
      submissionsByStatus: assignmentStats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
      capacityUtilization: classInstance.capacity
        ? (totalEnrollments / classInstance.capacity) * 100
        : null,
    };
  } catch (error) {
    console.error('❌ Error fetching class statistics:', error);
    throw error;
  }
}

/**
 * Gets all classes a student is enrolled in
 * @param studentId - Student's user ID
 * @returns List of classes with course information
 */
export async function getStudentClasses(studentId: string) {
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
                    name: true,
                    email: true,
                    picture: true,
                  },
                },
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

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      class: enrollment.class,
    }));
  } catch (error) {
    console.error('❌ Error fetching student classes:', error);
    return [];
  }
}

/**
 * Gets all students enrolled in a specific class
 * @param classId - Class ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of enrolled students with their enrollment info
 */
export async function getClassStudents(classId: string, teacherId: string) {
  try {
    // Verify teacher owns the class through course
    const classInstance = await getClassById(classId, teacherId);
    if (!classInstance) {
      throw new Error('Class not found or unauthorized');
    }

    const enrollments = await db.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return {
      class: classInstance,
      students: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        student: enrollment.student,
      })),
    };
  } catch (error) {
    console.error('❌ Error fetching class students:', error);
    throw error;
  }
}