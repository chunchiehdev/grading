import { db } from '@/lib/db.server';

export async function getOverallTeacherStats(teacherId: string) {
  const [totalCourses, totalStudents, totalSubmissions, avgScoreAgg] = await Promise.all([
    db.course.count({ where: { teacherId } }),
    db.enrollment.count({ where: { class: { course: { teacherId } } } }),
    db.submission.count({ where: { assignmentArea: { course: { teacherId } } } }),
    db.submission.aggregate({
      where: { assignmentArea: { course: { teacherId } }, finalScore: { not: null } },
      _avg: { finalScore: true },
    }),
  ]);

  return {
    totalCourses,
    totalStudents,
    totalSubmissions,
    averageScore: avgScoreAgg._avg.finalScore ?? 0,
  };
}

export async function getCoursePerformance(teacherId: string) {
  const courses = await db.course.findMany({
    where: { teacherId },
    include: {
      assignmentAreas: {
        include: {
          submissions: {
            select: { status: true, finalScore: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return courses.map((c) => {
    const submissions = c.assignmentAreas.flatMap((a) => a.submissions);
    const submissionsCount = submissions.length;
    const scores = submissions.map((s) => s.finalScore).filter((v): v is number => typeof v === 'number');
    const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    submissions.forEach((s: any) => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    return {
      id: c.id,
      name: c.name,
      submissionsCount,
      averageScore,
      statusCounts,
    };
  });
}

export async function getRubricUsage(teacherId: string) {
  const rubrics = await db.rubric.findMany({
    where: { teacherId },
    include: {
      assignmentAreas: {
        include: {
          submissions: { select: { finalScore: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return rubrics.map((r) => {
    const usageCount = r.assignmentAreas.length;
    const allScores = r.assignmentAreas.flatMap((a) => a.submissions)
      .map((s) => s.finalScore)
      .filter((v): v is number => typeof v === 'number');
    const averageScore = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    return {
      id: r.id,
      name: r.name,
      usageCount,
      averageScore,
    };
  });
}

