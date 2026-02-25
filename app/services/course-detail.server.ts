import { db } from '@/lib/db.server';
import type { CourseInfo } from './course.server';

export interface CoursePageData {
  course: Omit<CourseInfo, 'assignmentAreas'> & {
    assignmentAreas?: Array<{
      id: string;
      name: string;
      description: string | null;
      dueDate: Date | null;
      rubricId: string;
      formattedDueDate?: string;
      _count?: { submissions: number };
    }>;
  };
  formattedCreatedDate: string;
  invitation?: {
    id: string;
    code: string;
    expiresAt: Date;
    qrCodeUrl: string;
  };
  enrollmentStats: {
    totalEnrollments: number;
    recentEnrollments: Array<{
      student: {
        id: string;
        email: string;
        name: string;
      };
      enrolledAt: Date;
    }>;
  };
}

/**
 * Gets all data needed for the course detail page
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Course page data or null if unauthorized
 */
export async function getCoursePageData(courseId: string, teacherId: string): Promise<CoursePageData | null> {
  try {
    // Step 1: Single permission verification
    const courseExists = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
      select: { id: true },
    });

    if (!courseExists) {
      return null;
    }

    // Step 2: Get course data with assignment areas
    const course = await db.course.findFirst({
      where: { id: courseId },
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
    });

    if (!course) {
      throw new Error('Course disappeared after permission check');
    }

    // Step 3: Get active invitation code
    const activeInvitation = await db.invitationCode.findFirst({
      where: {
        courseId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Step 4: Get enrollment statistics using the correct service function
    const { getCourseEnrollmentStats } = await import('./enrollment.server');
    const enrollmentStats = await getCourseEnrollmentStats(courseId, teacherId);

    // Format dates on server side (keeping existing pattern)
    const { formatDateForDisplay } = await import('@/lib/date.server');
    const formattedCreatedDate = formatDateForDisplay(course.createdAt);

    // Format assignment area due dates
    const courseWithFormattedDates = {
      ...course,
      assignmentAreas: course.assignmentAreas?.map((area: any) => ({
        ...area,
        formattedDueDate: area.dueDate ? formatDateForDisplay(area.dueDate) : undefined,
      })),
    };

    // Generate QR code for active invitation if exists
    let invitation = undefined;
    if (activeInvitation) {
      const { generateInvitationQRCode } = await import('./invitation.server');
      const qrCodeUrl = await generateInvitationQRCode(activeInvitation.code);
      invitation = {
        id: activeInvitation.id,
        code: activeInvitation.code,
        expiresAt: activeInvitation.expiresAt,
        qrCodeUrl,
      };
    }

    return {
      course: courseWithFormattedDates,
      formattedCreatedDate,
      invitation,
      enrollmentStats: {
        totalEnrollments: enrollmentStats.totalEnrollments,
        recentEnrollments: enrollmentStats.recentEnrollments,
      },
    };
  } catch (error) {
    console.error('Error loading course page data:', error);
    return null;
  }
}
