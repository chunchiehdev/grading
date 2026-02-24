import { db } from '@/lib/db.server';
import type { StudentAssignmentInfo } from './submission.server';

export interface StudentCourseDetailData {
  course: {
    id: string;
    name: string;
    description: string | null;
    teacher: {
      id: string;
      email: string;
      name: string;
      picture: string | null;
    };
    _count: {
      assignmentAreas: number;
    };
  };
  myClass: {
    id: string;
    name: string;
    schedule: any;
  } | null;
  enrolledAt: Date;
  assignments: StudentAssignmentInfo[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    averageScore: number | null;
  };
}

/**
 * Gets course detail data for a student
 * @param courseId - Course ID
 * @param studentId - Student's user ID
 * @returns Student course detail data or null if not enrolled
 */
export async function getStudentCourseDetail(
  courseId: string,
  studentId: string
): Promise<StudentCourseDetailData | null> {
  try {
    // Step 1: Verify enrollment and get course basic info
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId,
        class: {
          courseId,
        },
      },
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
                    assignmentAreas: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return null; // Student not enrolled
    }

    // Step 2: Get all assignment areas for this course (class-specific + course-wide)
    const assignmentAreas = await db.assignmentArea.findMany({
      where: {
        OR: [
          // Class-specific assignments (if student has a class)
          enrollment.classId
            ? {
                classId: enrollment.classId,
              }
            : {},
          // Course-wide assignments
          {
            courseId,
            classId: null,
          },
        ],
      },
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
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
            criteria: true,
          },
        },
        submissions: {
          where: {
            studentId,
            status: { not: 'DRAFT' },
            isLatest: true, // Only show latest version of each submission
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Step 3: Transform to StudentAssignmentInfo format
    const assignments: StudentAssignmentInfo[] = assignmentAreas.map((area) => ({
      id: area.id,
      name: area.name,
      description: area.description,
      dueDate: area.dueDate,
      courseId: area.courseId,
      course: {
        id: area.course.id,
        name: area.course.name,
        teacher: {
          id: area.course.teacher.id,
          email: area.course.teacher.email,
          name: area.course.teacher.name,
          picture: area.course.teacher.picture,
        },
      },
      class: area.class
        ? {
            id: area.class.id,
            name: area.class.name,
          }
        : null,
      rubric: {
        id: area.rubric.id,
        name: area.rubric.name,
        description: area.rubric.description,
        criteria: area.rubric.criteria,
      },
      submissions: area.submissions.map((sub) => ({
        id: sub.id,
        studentId: sub.studentId,
        status: sub.status,
        finalScore: sub.finalScore,
        uploadedAt: sub.uploadedAt,
      })),
    }));

    // Step 4: Calculate statistics
    const total = assignments.length;
    const completed = assignments.filter((a) => a.submissions.some((s) => s.status === 'GRADED')).length;
    const pending = assignments.filter((a) => !a.submissions.some((s) => s.studentId === studentId)).length;

    const gradedSubmissions = assignments.flatMap((a) =>
      a.submissions.filter((s) => s.status === 'GRADED' && s.finalScore !== null)
    );

    const averageScore =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.finalScore || 0), 0) / gradedSubmissions.length
        : null;

    return {
      course: {
        id: enrollment.class.course.id,
        name: enrollment.class.course.name,
        description: enrollment.class.course.description,
        teacher: enrollment.class.course.teacher,
        _count: enrollment.class.course._count,
      },
      myClass: enrollment.class || null,
      enrolledAt: enrollment.enrolledAt,
      assignments,
      stats: {
        total,
        completed,
        pending,
        averageScore,
      },
    };
  } catch (error) {
    console.error('Error getting student course detail:', error);
    return null;
  }
}
