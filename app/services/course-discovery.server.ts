import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import type { DiscoverableCourse, ClassCard } from '@/types/course';

/**
 * Fetches all discoverable courses with their class sections and teacher information
 * A course is discoverable if it's active and has at least one active class
 *
 * @param options - Query options for pagination, sorting, and filtering
 * @param options.limit - Maximum number of courses to return (default: 50, max: 100)
 * @param options.offset - Number of courses to skip for pagination (default: 0)
 * @param options.sort - Sort order: 'newest' | 'teacher' | 'name' (default: 'newest')
 * @param options.search - Optional search term to filter courses by name, code, or teacher
 *
 * @returns Object containing:
 *   - courses: Array of DiscoverableCourse objects
 *   - total: Total count of discoverable courses (without limit)
 *   - hasMore: Boolean indicating if more results are available
 *
 * @throws Error if database query fails
 *
 * @example
 * const { courses, total, hasMore } = await getDiscoverableCourses({
 *   limit: 20,
 *   offset: 0,
 *   sort: 'newest',
 *   search: 'computer science'
 * });
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

    const result = {
      courses: discoverableCourses,
      total,
      hasMore: offset + limit < total,
    };

    logger.info(
      `Discovery query completed: ${discoverableCourses.length} courses returned, total=${total}, offset=${offset}, limit=${limit}`
    );
    return result;
  } catch (error) {
    logger.error('Error fetching discoverable courses:', { error, options });
    throw new Error('Failed to fetch discoverable courses. Please try again later.');
  }
}

/**
 * Gets the set of course IDs that a student is already enrolled in
 *
 * @param studentId - The student's unique user ID (UUID)
 *
 * @returns Set of course IDs where the student is actively enrolled
 *
 * @throws Error if database query fails
 *
 * @example
 * const enrolledCourses = await getStudentEnrolledCourseIds('user-123');
 * if (enrolledCourses.has('course-456')) {
 *   console.log('Already enrolled in this course');
 * }
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

    const courseIds = new Set(enrollments.map((e) => e.class.courseId));
    logger.debug(`Loaded enrolled courses for student: ${studentId}, count=${courseIds.size}`);
    return courseIds;
  } catch (error) {
    logger.error('Error fetching student enrolled courses:', { error, studentId });
    throw new Error('Failed to fetch your enrolled courses. Please try again.');
  }
}

/**
 * Creates a new enrollment for a student in a specific class
 * Performs comprehensive validation including duplicate check, capacity check, and active status verification
 *
 * Validation checks (in order):
 * 1. Class exists in database
 * 2. Class is marked as active
 * 3. Parent course is marked as active
 * 4. Class has available capacity (if limited)
 * 5. Student is not already enrolled in this class
 *
 * @param studentId - The student's unique user ID (UUID)
 * @param classId - The class section's unique ID (UUID) to enroll in
 *
 * @returns Object containing new enrollment details:
 *   - id: Enrollment record ID
 *   - studentId: The enrolled student's ID
 *   - classId: The class ID
 *   - enrollmentDate: ISO 8601 timestamp of enrollment
 *   - status: 'active' for newly created enrollments
 *
 * @throws Error with specific message indicating reason for failure:
 *   - 'Class not found' - classId doesn't exist
 *   - 'This class is no longer available' - class marked inactive
 *   - 'This course is no longer available' - course marked inactive
 *   - 'This class is currently full. Please select another section.' - at capacity
 *   - 'You are already enrolled in this class' - duplicate enrollment
 *
 * @example
 * try {
 *   const enrollment = await createEnrollment(studentId, classId);
 *   console.log(`Enrolled! Your enrollment ID is ${enrollment.id}`);
 * } catch (error) {
 *   if (error.message.includes('already enrolled')) {
 *     console.log('You are already in this class');
 *   }
 * }
 */
export async function createEnrollment(studentId: string, classId: string) {
  try {
    logger.info(`Attempting enrollment: studentId=${studentId}, classId=${classId}`);

    // Verify class exists and is active
    const cls = await db.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!cls) {
      logger.warn(`Enrollment failed - class not found: ${classId}`);
      throw new Error('Class not found');
    }

    if (!cls.isActive) {
      logger.warn(`Enrollment failed - class inactive: ${classId}`);
      throw new Error('This class is no longer available. It may have been closed by your teacher.');
    }

    if (!cls.course.isActive) {
      logger.warn(`Enrollment failed - course inactive: ${cls.course.id}`);
      throw new Error('This course is no longer available. It may have been closed by your teacher.');
    }

    // Check capacity
    const enrollmentCount = cls._count.enrollments;
    if (cls.capacity && enrollmentCount >= cls.capacity) {
      logger.warn(
        `Enrollment failed - class at capacity: classId=${classId}, enrolled=${enrollmentCount}, capacity=${cls.capacity}`
      );
      throw new Error('This class is currently full. Please select another section.');
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
      logger.warn(`Enrollment failed - duplicate: studentId=${studentId}, classId=${classId}`);
      throw new Error('You are already enrolled in this class');
    }

    // Create the enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        classId,
      },
    });

    logger.info(`✓ Enrollment created successfully: id=${enrollment.id}, student=${studentId}, class=${classId}`);

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      classId: enrollment.classId,
      enrollmentDate: enrollment.enrolledAt.toISOString(),
      status: 'active',
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Enrollment creation failed: ${error.message}`, { studentId, classId });
      throw error;
    }
    logger.error('Unexpected error creating enrollment:', { error, studentId, classId });
    throw new Error('Failed to enroll. Please try again or contact support.');
  }
}

/**
 * Checks if a student is currently enrolled in a specific class
 *
 * @param studentId - The student's unique user ID (UUID)
 * @param classId - The class section's unique ID (UUID)
 *
 * @returns true if the student has an active enrollment in this class, false otherwise
 *
 * @example
 * const isEnrolled = await isStudentEnrolledInClass(studentId, classId);
 * if (isEnrolled) {
 *   console.log('Student is already enrolled');
 * }
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

    logger.debug(`Enrollment check: studentId=${studentId}, classId=${classId}, enrolled=${!!enrollment}`);
    return !!enrollment;
  } catch (error) {
    logger.error('Error checking student enrollment:', { error, studentId, classId });
    return false;
  }
}

/**
 * Gets the current number of active enrollments for a class
 * Used for capacity validation and displaying enrollment statistics
 *
 * @param classId - The class section's unique ID (UUID)
 *
 * @returns Number of active student enrollments in the class (0 if class not found or no enrollments)
 *
 * @throws Error if database query fails unexpectedly
 *
 * @example
 * const count = await getClassEnrollmentCount(classId);
 * console.log(`${count} students enrolled`);
 */
export async function getClassEnrollmentCount(classId: string): Promise<number> {
  try {
    const count = await db.enrollment.count({
      where: { classId },
    });

    logger.debug(`Enrollment count for class ${classId}: ${count}`);
    return count;
  } catch (error) {
    logger.error('Error getting enrollment count:', { error, classId });
    throw new Error('Failed to get enrollment count. Please try again.');
  }
}
