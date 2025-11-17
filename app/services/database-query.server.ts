/**
 * Database Query Service for Learning Agent
 *
 * Provides safe, read-only access to database for the Learning Agent.
 * All queries go through existing service layer with proper authorization.
 */

import { db } from '@/lib/db.server';
import { getUser } from './auth.server';
import { getTeacherCourses, getCourseById } from './course.server';
import { getStudentEnrolledCourses, getCourseStudents } from './enrollment.server';
import {
  getStudentAssignments,
  listSubmissionsByAssignment,
  getStudentSubmissions,
  getSubmissionById,
  getSubmissionByIdForTeacher,
} from './submission.server';
import { getGradingStatistics } from './grading-result.server';
import { listAssignmentAreas, getAssignmentAreaById } from './assignment-area.server';
import logger from '@/utils/logger';

/**
 * Query types supported by the database query tool - All queries
 */
export type QueryType =
  // Existing queries
  | 'user_profile'
  | 'user_statistics'
  | 'student_courses'
  | 'teacher_courses'
  | 'course_students'
  | 'student_assignments'
  | 'assignment_submissions'
  | 'student_submissions'
  | 'submission_detail'
  | 'grading_statistics'
  // Phase 1: Core queries
  | 'course_detail' // Teacher: Get detailed course information
  | 'course_assignments' // Teacher: List assignments in a course
  | 'assignment_detail' // Teacher: Get assignment details with rubric
  | 'student_submission_detail_teacher' // Teacher: View student submission
  | 'assignment_detail_student' // Student: View assignment requirements
  | 'my_submission_detail' // Student: View my submission with grading results
  | 'pending_assignments' // Student: List pending/due assignments
  | 'enrolled_course_detail'; // Student: View enrolled course details

/**
 * Teacher-specific query types (read-only, teacher access only)
 */
export type TeacherQueryType =
  | 'user_profile'
  | 'user_statistics'
  | 'grading_statistics'
  | 'teacher_courses' // List all courses the teacher is instructing
  | 'course_detail' // Get detailed info about a specific course
  | 'course_students' // List all students in a course
  | 'course_assignments' // List all assignments in a course
  | 'assignment_detail' // Get assignment details with rubric
  | 'assignment_submissions' // Get all submissions for an assignment
  | 'student_submission_detail_teacher'; // View a student's detailed submission

/**
 * Student-specific query types (read-only, student access only)
 */
export type StudentQueryType =
  | 'user_profile'
  | 'user_statistics'
  | 'student_courses' // List all enrolled courses
  | 'student_assignments' // List all assignments across courses
  | 'student_submissions' // List all submissions with submission IDs
  | 'my_submission_detail' // View my submission with grading results
  | 'pending_assignments' // List unsubmitted assignments
  | 'enrolled_course_detail'; // View details of an enrolled course

/**
 * Query parameters
 */
export interface QueryParams {
  userId?: string;
  studentId?: string;
  teacherId?: string;
  courseId?: string;
  classId?: string; // For class-specific queries
  assignmentId?: string;
  submissionId?: string;
  sessionId?: string; // For grading session queries
  limit?: number;
  daysAhead?: number; // For pending assignments (default: 7)
  status?: string; // For filtering by status
  unreadOnly?: boolean; // For notification queries
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

      // Phase 1: Core queries
      case 'course_detail':
        data = await queryCourseDetail(params);
        break;

      case 'course_assignments':
        data = await queryCourseAssignments(params);
        break;

      case 'assignment_detail':
        data = await queryAssignmentDetail(params);
        break;

      case 'student_submission_detail_teacher':
        data = await queryStudentSubmissionDetailTeacher(params);
        break;

      case 'assignment_detail_student':
        data = await queryAssignmentDetailStudent(params);
        break;

      case 'my_submission_detail':
        data = await queryMySubmissionDetail(params);
        break;

      case 'pending_assignments':
        data = await queryPendingAssignments(params);
        break;

      case 'enrolled_course_detail':
        data = await queryEnrolledCourseDetail(params);
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
  // Accept userId, studentId, or teacherId - all refer to the same user
  const id = params.userId || params.studentId || params.teacherId;
  if (!id) {
    throw new Error('userId, studentId, or teacherId is required for user_profile query');
  }

  const user = await db.user.findUnique({
    where: { id },
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
  const userId = params.userId || params.studentId || params.teacherId;
  if (!userId) {
    throw new Error('userId, studentId, or teacherId is required for user_statistics query');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'STUDENT') {
    // Student statistics
    const [enrollments, submissions] = await Promise.all([
      db.enrollment.count({ where: { studentId: userId } }),
      db.submission.count({
        where: {
          studentId: userId,
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
      db.course.count({ where: { teacherId: userId } }),
      db.assignmentArea.count({
        where: { course: { teacherId: userId } },
      }),
      db.submission.count({
        where: {
          assignmentArea: {
            course: { teacherId: userId },
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

  const enrollments = await getCourseStudents(params.courseId, params.teacherId);

  return {
    courseId: params.courseId,
    totalStudents: enrollments.length,
    students: enrollments.slice(0, params.limit || 50).map((enrollment: any) => ({
      studentId: enrollment.student.id,
      studentName: enrollment.student.name || 'Unknown',
      className: enrollment.class?.name || null,
      enrolledAt: enrollment.enrolledAt?.toISOString().split('T')[0] || null,
      finalGrade: enrollment.finalGrade !== undefined ? enrollment.finalGrade : null,
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
  const userId = params.userId || params.studentId || params.teacherId;
  if (!userId) {
    throw new Error('userId, studentId, or teacherId is required for grading_statistics query');
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

/**
 * ============================================================================
 * PHASE 1: CORE QUERY FUNCTIONS
 * ============================================================================
 */

/**
 * Query course detail information (Teacher only)
 */
async function queryCourseDetail(params: QueryParams) {
  const teacherId = params.teacherId || params.userId;
  if (!params.courseId || !teacherId) {
    throw new Error('courseId and teacherId are required for course_detail query');
  }

  // Direct Prisma query with all needed fields
  const course = await db.course.findFirst({
    where: {
      id: params.courseId,
      teacherId, // Authorization check
    },
    include: {
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!course) {
    throw new Error('Course not found or unauthorized');
  }

  // Get additional statistics
  const [classCount, assignmentCount, totalStudents] = await Promise.all([
    db.class.count({ where: { courseId: params.courseId } }),
    db.assignmentArea.count({ where: { courseId: params.courseId } }),
    db.enrollment.count({
      where: { class: { courseId: params.courseId } },
    }),
  ]);

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code || null,
    description: course.description || null,
    teacherName: course.teacher.name,
    teacherEmail: course.teacher.email,
    totalClasses: classCount,
    totalAssignments: assignmentCount,
    totalStudents,
    createdAt: course.createdAt.toISOString().split('T')[0],
    syllabus: course.syllabus || null,
  };
}

/**
 * Query course assignments list (Teacher only)
 */
async function queryCourseAssignments(params: QueryParams) {
  const teacherId = params.teacherId || params.userId;
  if (!teacherId) {
    throw new Error('teacherId is required for course_assignments query');
  }

  // If courseId provided: get assignments for specific course
  if (params.courseId) {
    const assignments = await listAssignmentAreas(params.courseId, teacherId);

    return {
      totalAssignments: assignments.length,
      courseId: params.courseId,
      assignments: assignments.slice(0, params.limit || 50).map((assignment: any) => ({
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        description: assignment.description || null,
        className: assignment.class?.name || 'All Classes',
        dueDate: assignment.dueDate?.toISOString().split('T')[0] || null,
        rubricName: assignment.rubric?.name || 'Unknown',
        totalSubmissions: assignment._count?.submissions || 0,
        createdAt: assignment.createdAt.toISOString().split('T')[0],
      })),
    };
  }

  // If NO courseId: get assignments from ALL teacher's courses (single step!)
  const courses = await getTeacherCourses(teacherId);
  const allAssignments: any[] = [];
  
  for (const course of courses) {
    const courseAssignments = await listAssignmentAreas(course.id, teacherId);
    allAssignments.push(
      ...courseAssignments.map((assignment: any) => ({
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        description: assignment.description || null,
        courseName: course.name,
        courseId: course.id,
        className: assignment.class?.name || 'All Classes',
        dueDate: assignment.dueDate?.toISOString().split('T')[0] || null,
        rubricName: assignment.rubric?.name || 'Unknown',
        totalSubmissions: assignment._count?.submissions || 0,
        createdAt: assignment.createdAt.toISOString().split('T')[0],
      }))
    );
  }

  return {
    totalAssignments: allAssignments.length,
    totalCourses: courses.length,
    assignments: allAssignments.slice(0, params.limit || 100),
  };
}

/**
 * Query assignment detail (Teacher only)
 */
async function queryAssignmentDetail(params: QueryParams) {
  const teacherId = params.teacherId || params.userId;
  if (!params.assignmentId || !teacherId) {
    throw new Error('assignmentId and teacherId are required for assignment_detail query');
  }

  const assignment = await getAssignmentAreaById(params.assignmentId, teacherId);
  if (!assignment) {
    throw new Error('Assignment not found or unauthorized');
  }

  // Get submission statistics
  const [totalSubmissions, gradedCount] = await Promise.all([
    db.submission.count({ where: { assignmentAreaId: params.assignmentId } }),
    db.submission.count({
      where: {
        assignmentAreaId: params.assignmentId,
        status: 'GRADED',
      },
    }),
  ]);

  const assignmentData: any = assignment;
  return {
    assignmentId: assignmentData.id,
    assignmentName: assignmentData.name,
    description: assignmentData.description || null,
    courseName: assignmentData.course?.name || 'Unknown',
    className: assignmentData.class?.name || 'All Classes',
    dueDate: assignmentData.dueDate?.toISOString().split('T')[0] || null,
    rubric: assignmentData.rubric
      ? {
          rubricId: assignmentData.rubric.id,
          rubricName: assignmentData.rubric.name,
          rubricDescription: assignmentData.rubric.description,
        }
      : null,
    totalSubmissions,
    gradedCount,
    customGradingPrompt: assignmentData.customGradingPrompt || null,
    hasReferenceFiles: !!assignmentData.referenceFileIds,
    createdAt: assignmentData.createdAt.toISOString().split('T')[0],
  };
}

/**
 * Query student submission detail (Teacher view)
 */
async function queryStudentSubmissionDetailTeacher(params: QueryParams) {
  const teacherId = params.teacherId || params.userId;
  if (!params.submissionId || !teacherId) {
    throw new Error('submissionId and teacherId are required for student_submission_detail_teacher query');
  }

  const submission = await getSubmissionByIdForTeacher(params.submissionId, teacherId);
  if (!submission) {
    throw new Error('Submission not found or unauthorized');
  }

  const submissionData: any = submission;
  return {
    submissionId: submissionData.id,
    studentName: submissionData.student?.name || 'Unknown',
    studentEmail: submissionData.student?.email || null,
    assignmentName: submissionData.assignmentArea?.name || 'Unknown',
    courseName: submissionData.assignmentArea?.course?.name || 'Unknown',
    submittedAt: submissionData.createdAt?.toISOString() || null,
    status: submissionData.status,
    filePath: submissionData.filePath,
    aiAnalysisResult: submissionData.aiAnalysisResult || null,
    thoughtSummary: submissionData.thoughtSummary || null,
    finalScore: submissionData.finalScore !== undefined ? submissionData.finalScore : null,
    normalizedScore: submissionData.normalizedScore !== undefined ? submissionData.normalizedScore : null,
    teacherFeedback: submissionData.teacherFeedback || null,
    usedContext: submissionData.usedContext || null,
  };
}

/**
 * Query assignment detail (Student view)
 */
async function queryAssignmentDetailStudent(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!params.assignmentId || !studentId) {
    throw new Error('assignmentId and userId are required for assignment_detail_student query');
  }

  // Get assignment with verification that student is enrolled
  const assignment = await db.assignmentArea.findFirst({
    where: {
      id: params.assignmentId,
      OR: [
        // Assignment for all classes in the course
        {
          classId: null,
          course: {
            classes: {
              some: {
                enrollments: {
                  some: { studentId },
                },
              },
            },
          },
        },
        // Assignment for specific class where student is enrolled
        {
          class: {
            enrollments: {
              some: { studentId },
            },
          },
        },
      ],
    },
    include: {
      course: { select: { name: true } },
      class: { select: { name: true } },
      rubric: {
        select: {
          id: true,
          name: true,
          description: true,
          criteria: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error('Assignment not found or you are not enrolled in this course');
  }

  // Check if student has submitted
  const mySubmission = await db.submission.findFirst({
    where: {
      assignmentAreaId: params.assignmentId,
      studentId,
    },
    select: {
      status: true,
      finalScore: true,
      normalizedScore: true,
    },
  });

  return {
    assignmentId: assignment.id,
    assignmentName: assignment.name,
    description: assignment.description || null,
    courseName: assignment.course.name,
    className: assignment.class?.name || 'All Classes',
    dueDate: assignment.dueDate?.toISOString().split('T')[0] || null,
    rubric: assignment.rubric,
    hasSubmitted: !!mySubmission,
    mySubmissionStatus: mySubmission?.status || null,
    myScore: mySubmission?.normalizedScore || mySubmission?.finalScore || null,
  };
}

/**
 * Query my submission detail (Student view - enhanced)
 */
async function queryMySubmissionDetail(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!params.submissionId) {
    throw new Error('submissionId is required for my_submission_detail query');
  }
  if (!studentId) {
    throw new Error('studentId or userId is required for my_submission_detail query');
  }

  const submission = await getSubmissionById(params.submissionId, studentId);
  if (!submission) {
    throw new Error('Submission not found or unauthorized');
  }

  const submissionData: any = submission;
  return {
    submissionId: submissionData.id,
    assignmentName: submissionData.assignmentArea?.name || 'Unknown',
    courseName: submissionData.assignmentArea?.course?.name || 'Unknown',
    submittedAt: submissionData.createdAt?.toISOString() || null,
    status: submissionData.status,
    filePath: submissionData.filePath,
    aiAnalysisResult: submissionData.aiAnalysisResult || null,
    thoughtSummary: submissionData.thoughtSummary || null,
    finalScore: submissionData.finalScore !== undefined ? submissionData.finalScore : null,
    normalizedScore: submissionData.normalizedScore !== undefined ? submissionData.normalizedScore : null,
    teacherFeedback: submissionData.teacherFeedback || null,
    usedContext: submissionData.usedContext || null,
  };
}

/**
 * Query pending assignments (Student view)
 */
async function queryPendingAssignments(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!studentId) {
    throw new Error('userId is required for pending_assignments query');
  }

  const daysAhead = params.daysAhead || 7;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Get all assignments for courses the student is enrolled in
  // Pending = NOT submitted yet (no submission with status SUBMITTED/ANALYZED/GRADED)
  // Includes: no submission record OR submission is DRAFT (saved but not submitted)
  const assignments = await db.assignmentArea.findMany({
    where: {
      // Assignment must be in a course/class the student is enrolled in
      OR: [
        // Assignments for all classes in enrolled courses
        {
          classId: null,
          course: {
            classes: {
              some: {
                enrollments: {
                  some: { studentId },
                },
              },
            },
          },
        },
        // Assignments for specific classes where student is enrolled
        {
          class: {
            enrollments: {
              some: { studentId },
            },
          },
        },
      ],
      // AND must have NO actual submission (either no record OR only DRAFT)
      AND: [
        {
          OR: [
            // Case 1: No submission record at all
            {
              submissions: {
                none: { studentId },
              },
            },
            // Case 2: Only has DRAFT submission (not actually submitted yet)
            {
              submissions: {
                none: {
                  studentId,
                  status: {
                    in: ['SUBMITTED', 'ANALYZED', 'GRADED'],
                  },
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      course: { select: { name: true } },
      class: { select: { name: true } },
      submissions: {
        where: { studentId },
        select: { status: true },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: params.limit || 50,
  });

  return {
    totalPending: assignments.length,
    assignments: assignments.map((assignment) => {
      const daysUntilDue = assignment.dueDate
        ? Math.ceil((assignment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        courseName: assignment.course.name,
        className: assignment.class?.name || 'All Classes',
        dueDate: assignment.dueDate?.toISOString().split('T')[0] || null,
        daysUntilDue,
        hasSubmitted: assignment.submissions.length > 0,
        submissionStatus: assignment.submissions[0]?.status || null,
      };
    }),
  };
}

/**
 * Query enrolled course detail (Student view)
 */
async function queryEnrolledCourseDetail(params: QueryParams) {
  const studentId = params.studentId || params.userId;
  if (!params.courseId || !studentId) {
    throw new Error('courseId and userId are required for enrolled_course_detail query');
  }

  // Get enrollment to verify student is enrolled
  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId,
      class: { courseId: params.courseId },
    },
    include: {
      class: {
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error('You are not enrolled in this course');
  }

  const course = enrollment.class.course;

  // Get statistics
  const [totalAssignments, mySubmissionCount] = await Promise.all([
    db.assignmentArea.count({
      where: {
        courseId: params.courseId,
        OR: [{ classId: null }, { classId: enrollment.classId }],
      },
    }),
    db.submission.count({
      where: {
        studentId,
        assignmentArea: { courseId: params.courseId },
        status: { not: 'DRAFT' },
      },
    }),
  ]);

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code || null,
    description: course.description || null,
    teacherName: course.teacher.name,
    teacherEmail: course.teacher.email,
    myClassName: enrollment.class.name,
    enrolledAt: enrollment.enrolledAt.toISOString().split('T')[0],
    syllabus: course.syllabus || null,
    totalAssignments,
    mySubmissionCount,
  };
}
