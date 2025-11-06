/**
 * Database Query Service for Learning Agent
 *
 * Provides safe, read-only access to database for the Learning Agent.
 * All queries go through existing service layer with proper authorization.
 */

import { db } from '@/lib/db.server';
import { getUser } from './auth.server';
import { getTeacherCourses } from './course.server';
import { getStudentEnrolledCourses, getCourseStudents } from './enrollment.server';
import { getStudentAssignments, listSubmissionsByAssignment } from './submission.server';
import { getStudentSubmissions, getSubmissionById } from './submission.server';
import { getGradingStatistics } from './grading-result.server';
import logger from '@/utils/logger';

/**
 * Query types supported by the database query tool
 */
export type QueryType =
  | 'user_profile'
  | 'user_statistics'
  | 'student_courses'
  | 'teacher_courses'
  | 'course_students'
  | 'student_assignments'
  | 'assignment_submissions'
  | 'student_submissions'
  | 'submission_detail'
  | 'grading_statistics';

/**
 * Query parameters
 */
export interface QueryParams {
  userId?: string;
  studentId?: string;
  teacherId?: string;
  courseId?: string;
  assignmentId?: string;
  submissionId?: string;
  limit?: number;
}

/**
 * Typed data structures for query results
 */
export interface StudentCoursesData {
  totalCourses: number;
  courses: Array<{
    courseId: string;
    courseName: string;
    courseCode: string | null;
    classNames: string | null;
    teacherName: string;
    enrolledAt: string | null;
    totalClasses: number;
  }>;
}

export interface StudentSubmissionsData {
  totalSubmissions: number;
  submissions: Array<{
    submissionId: string;
    assignmentName: string;
    courseName: string;
    submittedAt: string | null;
    status: string;
    finalScore: number | null;
    normalizedScore: number | null;
  }>;
}

/**
 * Query result interface
 */
export interface QueryResult {
  success: boolean;
  data?: any; // TODO: Can be further typed based on queryType
  error?: string;
  queryType: QueryType;
  timestamp: string;
}

/**
 * Execute a database query based on query type and parameters
 */
export async function executeDatabaseQuery(queryType: QueryType, params: QueryParams): Promise<QueryResult> {
  const timestamp = new Date().toISOString();

  logger.info(
    {
      queryType,
      params: { ...params, userId: params.userId ? '***' : undefined },
    },
    '[Database Query] Executing query'
  );

  try {
    let data: any;

    switch (queryType) {
      case 'user_profile':
        data = await queryUserProfile(params);
        break;

      case 'user_statistics':
        data = await queryUserStatistics(params);
        break;

      case 'student_courses':
        data = await queryStudentCourses(params);
        break;

      case 'teacher_courses':
        data = await queryTeacherCourses(params);
        break;

      case 'course_students':
        data = await queryCourseStudents(params);
        break;

      case 'student_assignments':
        data = await queryStudentAssignments(params);
        break;

      case 'assignment_submissions':
        data = await queryAssignmentSubmissions(params);
        break;

      case 'student_submissions':
        data = await queryStudentSubmissions(params);
        break;

      case 'submission_detail':
        data = await querySubmissionDetail(params);
        break;

      case 'grading_statistics':
        data = await queryGradingStatistics(params);
        break;

      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }

    logger.info(
      {
        queryType,
        dataSize: JSON.stringify(data).length,
      },
      '[Database Query] Query successful'
    );

    return {
      success: true,
      data,
      queryType,
      timestamp,
    };
  } catch (error) {
    logger.error(
      {
        queryType,
        error: error instanceof Error ? error.message : String(error),
      },
      '[Database Query] Query failed'
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query failed',
      queryType,
      timestamp,
    };
  }
}

/**
 * Query user profile information
 */
async function queryUserProfile(params: QueryParams) {
  if (!params.userId) {
    throw new Error('userId is required for user_profile query');
  }

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      picture: true,
      hasSelectedRole: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    name: user.name || 'Unknown',
    email: user.email,
    role: user.role,
    hasSelectedRole: user.hasSelectedRole,
    memberSince: user.createdAt.toISOString().split('T')[0],
  };
}

/**
 * Query user statistics
 */
async function queryUserStatistics(params: QueryParams) {
  if (!params.userId) {
    throw new Error('userId is required for user_statistics query');
  }

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'STUDENT') {
    // Student statistics
    const [enrollments, submissions] = await Promise.all([
      db.enrollment.count({ where: { studentId: params.userId } }),
      db.submission.count({
        where: {
          studentId: params.userId,
          status: { not: 'DRAFT' },
        },
      }),
    ]);

    return {
      role: 'STUDENT',
      totalCourses: enrollments,
      totalSubmissions: submissions,
    };
  } else if (user.role === 'TEACHER') {
    // Teacher statistics
    const [courses, assignments, submissions] = await Promise.all([
      db.course.count({ where: { teacherId: params.userId } }),
      db.assignmentArea.count({
        where: { course: { teacherId: params.userId } },
      }),
      db.submission.count({
        where: {
          assignmentArea: {
            course: { teacherId: params.userId },
          },
          status: { not: 'DRAFT' },
        },
      }),
    ]);

    return {
      role: 'TEACHER',
      totalCourses: courses,
      totalAssignments: assignments,
      totalSubmissions: submissions,
    };
  }

  return { role: user.role };
}

/**
 * Query student's enrolled courses
 */
async function queryStudentCourses(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!studentId) {
    throw new Error('studentId or userId is required for student_courses query');
  }

  const enrolledCourses = await getStudentEnrolledCourses(studentId);

  return {
    totalCourses: enrolledCourses.length,
    courses: enrolledCourses.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code || null,
      classNames: course.classes?.map((c: { id: string; name: string }) => c.name).join(', ') || null,
      teacherName: course.teacher?.name || 'Unknown',
      enrolledAt: course.enrolledAt?.toISOString().split('T')[0] || null,
      totalClasses: course.classes?.length || 0,
    })),
  };
}

/**
 * Query teacher's courses
 */
async function queryTeacherCourses(params: QueryParams) {
  const teacherId = params.teacherId || params.userId;
  if (!teacherId) {
    throw new Error('teacherId or userId is required for teacher_courses query');
  }

  const courses = await getTeacherCourses(teacherId);

  return {
    totalCourses: courses.length,
    courses: courses.map((course: any) => ({
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code || null,
      description: course.description || null,
      totalClasses: course.classes?.length || 0,
      totalAssignments: course.assignmentAreas?.length || 0,
      createdAt: course.createdAt.toISOString().split('T')[0],
    })),
  };
}

/**
 * Query students in a course
 */
async function queryCourseStudents(params: QueryParams) {
  if (!params.courseId || !params.teacherId) {
    throw new Error('courseId and teacherId are required for course_students query');
  }

  const students = await getCourseStudents(params.courseId, params.teacherId);

  return {
    courseId: params.courseId,
    totalStudents: students.length,
    students: students.slice(0, params.limit || 50).map((student: any) => ({
      studentId: student.id,
      studentName: student.name,
      className: student.class?.name || null,
      enrolledAt: student.enrolledAt?.toISOString().split('T')[0] || null,
      finalGrade: student.finalGrade !== undefined ? student.finalGrade : null,
    })),
  };
}

/**
 * Query student's assignments
 */
async function queryStudentAssignments(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!studentId) {
    throw new Error('studentId or userId is required for student_assignments query');
  }

  const assignments = await getStudentAssignments(studentId);

  return {
    totalAssignments: assignments.length,
    assignments: assignments.slice(0, params.limit || 50).map((assignment) => ({
      assignmentId: assignment.id,
      assignmentName: assignment.name,
      courseName: assignment.course.name,
      className: assignment.class?.name,
      dueDate: assignment.dueDate?.toISOString().split('T')[0],
      hasSubmitted: assignment.submissions && assignment.submissions.length > 0,
      submissionStatus: assignment.submissions?.[0]?.status,
    })),
  };
}

/**
 * Query submissions for an assignment
 */
async function queryAssignmentSubmissions(params: QueryParams) {
  if (!params.assignmentId || !params.teacherId) {
    throw new Error('assignmentId and teacherId are required for assignment_submissions query');
  }

  const submissions = await listSubmissionsByAssignment(params.assignmentId, params.teacherId);

  return {
    assignmentId: params.assignmentId,
    totalSubmissions: submissions.length,
    submissions: submissions.slice(0, params.limit || 50).map((submission: any) => ({
      submissionId: submission.id,
      studentName: submission.student?.name || 'Unknown',
      submittedAt: submission.createdAt?.toISOString() || null,
      status: submission.status,
      finalScore: submission.finalScore !== undefined ? submission.finalScore : null,
      normalizedScore: submission.normalizedScore !== undefined ? submission.normalizedScore : null,
    })),
  };
}

/**
 * Query student's submission history
 */
async function queryStudentSubmissions(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!studentId) {
    throw new Error('studentId or userId is required for student_submissions query');
  }

  const submissions = await getStudentSubmissions(studentId);

  return {
    totalSubmissions: submissions.length,
    submissions: submissions.slice(0, params.limit || 50).map((submission: any) => ({
      submissionId: submission.id,
      assignmentName: submission.assignmentArea?.name || 'Unknown',
      courseName: submission.assignmentArea?.course?.name || 'Unknown',
      submittedAt: submission.createdAt?.toISOString() || null,
      status: submission.status,
      finalScore: submission.finalScore !== undefined ? submission.finalScore : null,
      normalizedScore: submission.normalizedScore !== undefined ? submission.normalizedScore : null,
    })),
  };
}

/**
 * Query specific submission detail
 */
async function querySubmissionDetail(params: QueryParams) {
  if (!params.submissionId) {
    throw new Error('submissionId is required for submission_detail query');
  }

  const studentId = params.studentId || params.userId;
  if (!studentId) {
    throw new Error('studentId or userId is required for submission_detail query');
  }

  const submission = await getSubmissionById(params.submissionId, studentId);

  if (!submission) {
    throw new Error('Submission not found or access denied');
  }

  return {
    submissionId: submission.id,
    assignmentName: (submission.assignmentArea as any)?.name || 'Unknown',
    courseName: (submission.assignmentArea as any)?.course?.name || 'Unknown',
    submittedAt: (submission as any).createdAt?.toISOString() || null,
    status: submission.status,
    finalScore: submission.finalScore !== undefined ? submission.finalScore : null,
    normalizedScore: submission.normalizedScore !== undefined ? submission.normalizedScore : null,
    thoughtSummary: (submission as any).thoughtSummary || null,
    teacherFeedback: (submission as any).teacherFeedback || null,
  };
}

/**
 * Query grading statistics
 */
async function queryGradingStatistics(params: QueryParams) {
  const userId = params.userId;
  if (!userId) {
    throw new Error('userId is required for grading_statistics query');
  }

  const stats = await getGradingStatistics(userId);

  if (!stats || !stats.stats) {
    return {
      totalGradings: 0,
      completedGradings: 0,
      averageScore: null,
      totalTokensUsed: 0,
      averageGradingTime: null,
    };
  }

  return {
    totalGradings: stats.stats.totalResults || 0,
    completedGradings: stats.stats.completedResults || 0,
    averageScore: stats.stats.averageScore ? Math.round(stats.stats.averageScore * 10) / 10 : null,
    totalTokensUsed: stats.stats.totalTokensUsed || 0,
    averageGradingTime: null, // Not available in current stats
  };
}
