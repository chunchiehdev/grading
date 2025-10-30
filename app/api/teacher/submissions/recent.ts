import type { LoaderFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { db } from '@/lib/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  try {
    // Get recent submissions for courses taught by this teacher
    const submissions = await db.submission.findMany({
      where: {
        assignmentArea: {
          course: {
            teacherId: teacher.id,
          },
        },
      },
      include: {
        assignmentArea: {
          select: {
            id: true,
            name: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const formattedSubmissions = submissions.map((sub) => ({
      id: sub.id,
      assignmentId: sub.assignmentAreaId,
      assignmentName: sub.assignmentArea.name,
      courseId: sub.assignmentArea.course.id,
      courseName: sub.assignmentArea.course.name,
      studentId: sub.studentId,
      studentName: sub.student.name,
      submittedAt: sub.createdAt.toISOString(),
      status: sub.status,
      grade: sub.finalScore,
      feedback: sub.teacherFeedback,
    }));

    return Response.json({
      success: true,
      data: formattedSubmissions,
    });
  } catch (error) {
    console.error('Failed to fetch recent submissions:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch submissions',
      },
      { status: 500 }
    );
  }
}
