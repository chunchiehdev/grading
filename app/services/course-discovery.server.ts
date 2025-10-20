import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import type { DiscoverableCourse, ClassCard } from '@/types/course';

/**
 * Fetches all discoverable courses with their class sections and teacher information
 * A course is discoverable if it's active and has at least one active class
 * @param options - Query options (limit, offset, sort, search)
 * @returns Array of discoverable courses with metadata
 */
export async function getDiscoverableCourses(options?: {
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'teacher' | 'name';
  search?: string;
}) {
  try {
    const { limit = 50, offset = 0, sort = 'newest', search } = options || {};

    // Build where clause for course filtering
    const whereClause: any = {
      isActive: true,
      classes: {
        some: { isActive: true },
      },
    };

    // Add search filtering if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { teacher: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Define sort order
    const orderBy: any = {};
    switch (sort) {
      case 'teacher':
        orderBy.teacher = { name: 'asc' };
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
    }

    // Fetch courses with related data
    const courses = await db.course.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        classes: {
          where: { isActive: true },
          include: {
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await db.course.count({ where: whereClause });

    // Transform courses to DiscoverableCourse format
    const discoverableCourses: DiscoverableCourse[] = courses.map((course) => ({
      id: course.id,
      name: course.name,
      description: course.description,
      code: course.code,
      teacher: {
        id: course.teacher.id,
        name: course.teacher.name,
        email: course.teacher.email,
        picture: course.teacher.picture,
      },
      classes: course.classes.map((cls) => {
        const enrollmentCount = cls._count.enrollments;
        const capacity = cls.capacity;
        const isFull = capacity ? enrollmentCount >= capacity : false;

        return {
          id: cls.id,
          name: cls.name,
          schedule: cls.schedule as ClassCard['schedule'],
          capacity,
          enrollmentCount,
          isFull,
        };
      }),
      enrollmentStatus: 'not_enrolled', // Will be updated by caller
      createdAt: course.createdAt.toISOString(),
    }));

    return {
      courses: discoverableCourses,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    logger.error('Error fetching discoverable courses:', error);
    throw new Error('Failed to fetch discoverable courses');
  }
}

/**
 * Gets the set of course IDs that a student is already enrolled in
 * @param studentId - The student's user ID
 * @returns Set of course IDs the student is enrolled in
 */
export async function getStudentEnrolledCourseIds(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
      },
      select: {
        class: {
          select: { courseId: true },
        },
      },
    });

    return new Set(enrollments.map((e) => e.class.courseId));
  } catch (error) {
    logger.error('Error fetching student enrolled courses:', error);
    throw new Error('Failed to fetch enrolled courses');
  }
}

/**
 * Creates a new enrollment for a student in a class
 * Validates:
 * - Student is not already enrolled in this class
 * - Class exists and is active
 * - Course exists and is active
 * - Class is not at capacity
 * @param studentId - The student's user ID
 * @param classId - The class ID to enroll in
 * @returns The created enrollment
 */
export async function createEnrollment(studentId: string, classId: string) {
  try {
    // Verify class exists and is active
    const cls = await db.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!cls) {
      throw new Error('Class not found');
    }

    if (!cls.isActive) {
      throw new Error('Class is not active');
    }

    if (!cls.course.isActive) {
      throw new Error('Course is not active');
    }

    // Check capacity
    const enrollmentCount = cls._count.enrollments;
    if (cls.capacity && enrollmentCount >= cls.capacity) {
      throw new Error('Class is at capacity');
    }

    // Check for existing enrollment
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

    // Create the enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        classId,
      },
    });

    logger.info(`Enrollment created: student=${studentId}, class=${classId}`);

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      classId: enrollment.classId,
      enrollmentDate: enrollment.enrolledAt.toISOString(),
      status: 'active',
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Enrollment creation failed: ${error.message}`);
      throw error;
    }
    logger.error('Unexpected error creating enrollment:', error);
    throw new Error('Failed to create enrollment');
  }
}

/**
 * Checks if a student is enrolled in a specific class
 * @param studentId - The student's user ID
 * @param classId - The class ID to check
 * @returns true if enrolled, false otherwise
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
    logger.error('Error checking student enrollment:', error);
    return false;
  }
}

/**
 * Gets the current enrollment count for a class
 * @param classId - The class ID
 * @returns Number of active enrollments
 */
export async function getClassEnrollmentCount(classId: string): Promise<number> {
  try {
    return await db.enrollment.count({
      where: { classId },
    });
  } catch (error) {
    logger.error('Error getting enrollment count:', error);
    throw new Error('Failed to get enrollment count');
  }
}
