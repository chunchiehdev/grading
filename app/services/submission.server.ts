import { db, type Prisma } from '@/types/database';
import type { SubmissionInfo, StudentAssignmentInfo } from '@/types/student';
import { parseGradingResult, type GradingResultData, type UsedContext } from '@/utils/grading-helpers';
import { UsedContextSchema } from '@/schemas/grading';
import { publishSubmissionCreatedNotification } from './notification.server';
import { deleteFromStorage } from './storage.server';
import logger from '@/utils/logger';

export interface CreateSubmissionData {
  assignmentAreaId: string;
  filePath: string;
}

// Re-export types for backwards compatibility
export type { SubmissionInfo, StudentAssignmentInfo };

/**
 * Creates a new submission for a student
 * @param {string} studentId - The student's user ID
 * @param {CreateSubmissionData} submissionData - Submission creation data
 * @returns {Promise<SubmissionInfo>} Created submission information
 */
export async function createSubmission(
  studentId: string,
  submissionData: CreateSubmissionData
): Promise<SubmissionInfo> {
  try {
    // Verify the assignment area exists
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: submissionData.assignmentAreaId },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        rubric: true,
      },
    });

    if (!assignmentArea) {
      throw new Error('Assignment area not found');
    }

    // Check if submission is past due date
    if (assignmentArea.dueDate && new Date() > assignmentArea.dueDate) {
      throw new Error('提交期限已過，無法再提交作業');
    }

    const submission = await db.submission.create({
      data: {
        studentId,
        assignmentAreaId: submissionData.assignmentAreaId,
        filePath: submissionData.filePath,
        status: 'SUBMITTED',
      },
      include: {
        assignmentArea: {
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
            rubric: true,
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
    });

    logger.info({ submissionId: submission.id, studentId }, '  Created submission');

    // Send submission notification to teacher via WebSocket
    try {
      await publishSubmissionCreatedNotification({
        submissionId: submission.id,
        assignmentId: submission.assignmentAreaId,
        assignmentName: assignmentArea.name,
        courseId: assignmentArea.courseId,
        courseName: assignmentArea.course.name,
        studentId: submission.studentId,
        studentName: submission.student.name,
        teacherId: assignmentArea.course.teacher.id,
        submittedAt: submission.createdAt,
      });
    } catch (notificationError) {
      console.error('⚠️ Failed to send submission notification:', notificationError);
      // Don't fail the entire submission creation if notification fails
    }

    return submission;
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    throw error;
  }
}

/**
 * Creates a submission and links it to an existing AI grading result.
 * Supports version tracking: creates new versions instead of updating existing submissions
 * Special handling: Converts DRAFT to SUBMITTED without incrementing version
 */
export async function createSubmissionAndLinkGradingResult(
  studentId: string,
  assignmentAreaId: string,
  filePathOrId: string,
  sessionId: string,
  chatMessages: any[] = []
): Promise<{ submissionId: string }> {
  // Import version management functions dynamically to avoid circular dependencies
  const { getLatestSubmissionVersion, createNewSubmissionVersion } = await import('./version-management.server');

  // Check for existing submissions (including DRAFT)
  const existingLatestSubmission = await getLatestSubmissionVersion(assignmentAreaId, studentId);

  let submission: SubmissionInfo | null;

  if (existingLatestSubmission) {
    // SPECIAL CASE: If existing submission is DRAFT, convert it to SUBMITTED
    // This ensures version 1 is the first actual submission, not a draft
    if (existingLatestSubmission.status === 'DRAFT') {
      logger.info(
        `🔄 Converting DRAFT to SUBMITTED for student ${studentId}, assignment ${assignmentAreaId}`
      );

      // Fetch assignmentArea with teacher info for notification
      const assignmentArea = await db.assignmentArea.findUnique({
        where: { id: assignmentAreaId },
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!assignmentArea) {
        throw new Error('Assignment area not found');
      }

      // Check if submission is past due date
      if (assignmentArea.dueDate && new Date() > assignmentArea.dueDate) {
        throw new Error('提交期限已過，無法再提交作業');
      }

      // Update the draft to SUBMITTED status
      submission = await db.submission.update({
        where: { id: existingLatestSubmission.id },
        data: {
          filePath: filePathOrId,
          status: 'SUBMITTED',
          uploadedAt: new Date(), // Update to current submission time
        },
        include: {
          assignmentArea: {
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
              rubric: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
      });

      logger.info(`✅ Converted DRAFT to SUBMITTED (version ${submission.version}, ID: ${submission.id})`);

      // Send submission notification to teacher
      try {
        if (submission.student) {
          await publishSubmissionCreatedNotification({
            submissionId: submission.id,
            assignmentId: submission.assignmentAreaId,
            assignmentName: assignmentArea.name,
            courseId: assignmentArea.courseId,
            courseName: assignmentArea.course.name,
            studentId: submission.studentId,
            studentName: submission.student.name,
            teacherId: assignmentArea.course.teacher.id,
            submittedAt: submission.uploadedAt,
          });
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send submission notification:', notificationError);
      }
    }
    // Existing submission is already SUBMITTED/ANALYZED - check if resubmission is allowed
    else if (existingLatestSubmission.status === 'GRADED') {
      throw new Error('Cannot resubmit: Assignment has already been graded');
    }
    // Regular resubmission - create new version
    else {
      // Fetch assignmentArea with teacher info for notification
      const assignmentArea = await db.assignmentArea.findUnique({
        where: { id: assignmentAreaId },
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!assignmentArea) {
        throw new Error('Assignment area not found');
      }

      // Check if submission is past due date
      if (assignmentArea.dueDate && new Date() > assignmentArea.dueDate) {
        throw new Error('提交期限已過，無法再提交作業');
      }

      // Create NEW VERSION instead of updating existing submission
      logger.info(
        `🔄 Resubmitting: Creating version ${existingLatestSubmission.version + 1} for assignment ${assignmentAreaId}`
      );

      submission = await createNewSubmissionVersion(
        studentId,
        assignmentAreaId,
        filePathOrId,
        existingLatestSubmission.id
      );

      logger.info(`✅ Created new submission version ${submission.version} (ID: ${submission.id})`);

      // Send submission notification to teacher via WebSocket (for resubmission)
      try {
        if (submission.student) {
          await publishSubmissionCreatedNotification({
            submissionId: submission.id,
            assignmentId: submission.assignmentAreaId,
            assignmentName: assignmentArea.name,
            courseId: assignmentArea.courseId,
            courseName: assignmentArea.course.name,
            studentId: submission.studentId,
            studentName: submission.student.name,
            teacherId: assignmentArea.course.teacher.id,
            submittedAt: submission.uploadedAt,
          });
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send resubmission notification:', notificationError);
        // Don't fail the entire submission if notification fails
      }
    }
  } else {
    // First-time submission - create version 1
    submission = await createSubmission(studentId, {
      assignmentAreaId,
      filePath: filePathOrId,
    });
    logger.info(`✅ Created first submission version (ID: ${submission.id})`);
  }

  if (!submission) {
    throw new Error('Failed to create or update submission');
  }

  if (!sessionId) {
    logger.warn(`Submission ${submission.id} created without a sessionId. AI result will not be linked.`);
    return { submissionId: submission.id };
  }

  try {
    const gradingResult = await db.gradingResult.findFirst({
      where: {
        gradingSessionId: sessionId,
        status: 'COMPLETED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (gradingResult && gradingResult.result) {
      let aiAnalysisResult = parseGradingResult(gradingResult.result);
      // Fallback: if strict Zod validation fails (e.g. new enum values in sparringQuestions),
      // use the raw DB value directly so we don't lose the entire result
      if (!aiAnalysisResult && typeof gradingResult.result === 'object') {
        logger.warn(`⚠️ parseGradingResult failed for result ${gradingResult.id}, using raw DB value as fallback`);
        aiAnalysisResult = gradingResult.result as GradingResultData;
      }
      // Attach chat messages into the AI Analysis Result to preserve history in the DB
      if (aiAnalysisResult && chatMessages.length > 0) {
        (aiAnalysisResult as any).chatHistory = chatMessages;
      }
      
      const finalScore = aiAnalysisResult?.totalScore ? Math.round(aiAnalysisResult.totalScore) : null;

      // Get normalized score (100-point scale) from grading result
      const normalizedScore = gradingResult.normalizedScore ?? null;

      // Feature 004: Copy context transparency from GradingResult to Submission
      // Validate and parse usedContext from JsonValue to UsedContext type
      let usedContext: UsedContext | null = null;
      if (gradingResult.usedContext) {
        const parseResult = UsedContextSchema.safeParse(gradingResult.usedContext);
        if (parseResult.success) {
          usedContext = parseResult.data;
        } else {
          logger.warn({ err: parseResult.error }, `⚠️ Invalid usedContext format in grading result ${gradingResult.id}:`);
        }
      }

      logger.info(
        `🔗 Linking AI result to submission ${submission.id}: totalScore=${aiAnalysisResult?.totalScore}, finalScore=${finalScore}, normalizedScore=${normalizedScore}, context=${usedContext ? 'yes' : 'no'}`
      );

      // FIXED: Pass values directly (including null) to updateSubmission
      // The 'in' operator check will handle what gets updated
      await updateSubmission(submission.id, {
        ...(aiAnalysisResult !== null && { aiAnalysisResult }),
        ...(finalScore !== null && { finalScore }),
        normalizedScore, // Always include, even if null
        ...(usedContext !== null && { usedContext }), // Feature 004: Now properly typed
        status: 'ANALYZED',
        ...(gradingResult.thoughtSummary !== null && { thoughtSummary: gradingResult.thoughtSummary }), // Feature 005: Copy thought summary
        ...(gradingResult.thinkingProcess !== null && { thinkingProcess: gradingResult.thinkingProcess }), // Feature 012: Copy thinking process
        ...(gradingResult.gradingRationale !== null && { gradingRationale: gradingResult.gradingRationale }), // Feature 012: Copy grading rationale
      });

      logger.info(`✅ Successfully linked AI result to submission ${submission.id}`);
    } else {
      logger.warn(
        `⚠️ Could not find a completed grading result for session ${sessionId} to link to submission ${submission.id}.`
      );
      logger.warn(`   Session exists: ${sessionId ? 'Yes' : 'No'}`);
      logger.warn(`   Grading result found: ${gradingResult ? 'Yes' : 'No'}`);
      if (gradingResult) {
        logger.warn(`   Result has data: ${gradingResult.result ? 'Yes' : 'No'}`);
      }
    }
  } catch (error) {
    logger.error({ err: error }, `Error linking AI analysis for submission ${submission.id}:`);
  }

  return { submissionId: submission.id };
}

/**
 * Gets all available assignments for a student (assignment areas they can submit to)
 * Only shows assignments from courses the student is enrolled in
 * @param {string} studentId - The student's user ID
 * @returns {Promise<StudentAssignmentInfo[]>} List of available assignments
 */
export async function getStudentAssignments(studentId: string, courseId?: string): Promise<StudentAssignmentInfo[]> {
  try {
    // Get all enrollments with class and course information
    const enrollments = await db.enrollment.findMany({
      where: { 
        studentId,
        ...(courseId ? { class: { courseId } } : {}) // Optimization: only fetch enrollments for specific course if provided
      },
      include: {
        class: {
          select: {
            courseId: true,
          },
        },
      },
    });

    const enrolledCourseIds = enrollments.map((enrollment) => enrollment.class.courseId);
    const enrolledClassIds = enrollments.map((enrollment) => enrollment.classId);

    if (enrolledCourseIds.length === 0) {
      // Student is not enrolled in any classes
      return [];
    }

    // Query assignments that either:
    // 1. Belong to student's classes (classId IN enrolledClassIds)
    // 2. OR are course-wide (classId = NULL AND courseId IN enrolledCourseIds)
    const assignmentAreas = await db.assignmentArea.findMany({
      where: {
        AND: [
          courseId ? { courseId } : {}, // Filter by courseId if provided
          {
            OR: [
              // Class-specific assignments
              {
                classId: {
                  in: enrolledClassIds,
                },
              },
              // Course-wide assignments (for courses student is enrolled in)
              {
                classId: null,
                courseId: {
                  in: enrolledCourseIds,
                },
              },
            ],
          }
        ]
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
        class: true, // Include class information
        rubric: true,
        submissions: {
          where: {
            studentId,
            status: { not: 'DRAFT' }, // Exclude draft submissions
            isLatest: true, // Only show latest version
          },
          select: {
            id: true,
            studentId: true,
            assignmentAreaId: true,
            status: true,
            finalScore: true,
            uploadedAt: true,
            // Don't include assignmentArea - we already have course, class, rubric in parent
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return assignmentAreas;
  } catch (error) {
    console.error('❌ Error fetching student assignments:', error);
    return [];
  }
}

/**
 * Lists submissions for an assignment area (teacher view)
 * Only shows the latest version of each student's submission
 * @param assignmentId - Assignment area ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of submissions with student info
 */
export async function listSubmissionsByAssignment(assignmentId: string, teacherId: string): Promise<SubmissionInfo[]> {
  try {
    // Verify teacher owns the assignment area through course
    const assignmentArea = await db.assignmentArea.findFirst({
      where: {
        id: assignmentId,
        course: {
          teacherId,
        },
      },
    });

    if (!assignmentArea) {
      throw new Error('Assignment area not found or unauthorized');
    }

    const submissions = await db.submission.findMany({
      where: {
        assignmentAreaId: assignmentId,
        status: { not: 'DRAFT' }, // Only include actual submissions
        isDeleted: false, // Exclude deleted submissions
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
        assignmentArea: {
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
            rubric: true,
          },
        },
      },
      orderBy: [{ uploadedAt: 'desc' }, { version: 'desc' }],
    });

    // Keep the latest non-draft submission per student.
    // This avoids empty teacher lists when the absolute latest version is a DRAFT.
    const latestByStudent = new Map<string, SubmissionInfo>();
    for (const submission of submissions) {
      if (!latestByStudent.has(submission.studentId)) {
        latestByStudent.set(submission.studentId, submission);
      }
    }

    return Array.from(latestByStudent.values());
  } catch (error) {
    console.error('❌ Error fetching assignment submissions:', error);
    return [];
  }
}

/**
 * Gets assignment area for submission with enrollment validation
 * @param assignmentId - Assignment area ID
 * @param studentId - Student's user ID (optional, for enrollment check)
 * @returns Assignment area info or null
 */
export async function getAssignmentAreaForSubmission(
  assignmentId: string,
  studentId?: string,
  includeSubmissions: boolean = false
) {
  try {
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: assignmentId },
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
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
            criteria: true, // Include full grading criteria for student view
          },
        },
        ...(includeSubmissions && studentId
          ? {
              submissions: {
                where: {
                  studentId,
                  status: { not: 'DRAFT' },
                  isLatest: true, // Only show latest version
                },
                select: {
                  id: true,
                  status: true,
                  uploadedAt: true,
                },
              },
            }
          : {}),
      },
    });

    if (!assignmentArea) {
      return null;
    }

    // If studentId provided, check enrollment
    if (studentId) {
      // Check if student is enrolled in the appropriate class
      const courseId = assignmentArea.courseId;
      const classId = assignmentArea.classId;

      let enrollment;
      if (classId) {
        // Class-specific assignment: student must be enrolled in this specific class
        enrollment = await db.enrollment.findUnique({
          where: {
            studentId_classId: {
              studentId,
              classId,
            },
          },
        });
      } else {
        // Course-wide assignment: student must be enrolled in any class of this course
        enrollment = await db.enrollment.findFirst({
          where: {
            studentId,
            class: {
              courseId,
            },
          },
        });
      }

      if (!enrollment) {
        throw new Error('Student is not enrolled in this course or class');
      }
    }

    return assignmentArea;
  } catch (error) {
    console.error('❌ Error fetching assignment area for submission:', error);
    throw error;
  }
}

/**
 * Gets all submissions by a student
 * Only returns the latest version of each submission
 * @param {string} studentId - The student's user ID
 * @returns {Promise<SubmissionInfo[]>} List of student's submissions
 */
export async function getStudentSubmissions(studentId: string): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: {
        studentId,
        status: { not: 'DRAFT' }, // Only include actual submissions
        isDeleted: false, // Exclude deleted submissions
      },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: [{ uploadedAt: 'desc' }, { version: 'desc' }],
    });

    // Keep the latest non-draft submission per assignment area.
    // This avoids empty lists when latest version is a DRAFT resubmission.
    const latestByAssignment = new Map<string, SubmissionInfo>();
    for (const submission of submissions) {
      if (!latestByAssignment.has(submission.assignmentAreaId)) {
        latestByAssignment.set(submission.assignmentAreaId, submission);
      }
    }

    return Array.from(latestByAssignment.values());
  } catch (error) {
    console.error('❌ Error fetching student submissions:', error);
    return [];
  }
}

/**
 * Gets all submissions by a specific student (alias with clearer name)
 * @param studentId - The student's user ID
 * @returns List of submissions including assignment area and course
 */
export async function getSubmissionsByStudentId(studentId: string): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: {
        studentId,
        status: { not: 'DRAFT' }, // Only include actual submissions
        isDeleted: false, // Exclude deleted submissions
      },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: [{ uploadedAt: 'desc' }, { version: 'desc' }],
    });

    // Keep the latest non-draft submission per assignment area.
    const latestByAssignment = new Map<string, SubmissionInfo>();
    for (const submission of submissions) {
      if (!latestByAssignment.has(submission.assignmentAreaId)) {
        latestByAssignment.set(submission.assignmentAreaId, submission);
      }
    }

    return Array.from(latestByAssignment.values());
  } catch (error) {
    console.error('❌ Error fetching submissions by student:', error);
    return [];
  }
}

/**
 * Gets a specific submission for teacher viewing (teacher authorization required)
 * @param {string} submissionId - Submission ID
 * @param {string} teacherId - Teacher's user ID for authorization
 * @returns {Promise<SubmissionInfo | null>} Submission information or null if not found/unauthorized
 */
export async function getSubmissionByIdForTeacher(
  submissionId: string,
  teacherId: string
): Promise<SubmissionInfo | null> {
  try {
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        isDeleted: false, // Exclude soft-deleted submissions
        assignmentArea: {
          course: {
            teacherId: teacherId,
          },
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
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
    });
    return submission;
  } catch (error) {
    console.error('❌ Error fetching submission for teacher:', error);
    return null;
  }
}

/**
 * Gets a specific submission (student authorization required)
 * @param {string} submissionId - Submission ID
 * @param {string} studentId - Student's user ID for authorization
 * @returns {Promise<SubmissionInfo | null>} Submission information or null if not found/unauthorized
 */
export async function getSubmissionById(submissionId: string, studentId: string): Promise<SubmissionInfo | null> {
  try {
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        studentId, // Ensure student owns this submission
        isDeleted: false, // Exclude soft-deleted submissions
      },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
    });

    return submission;
  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    return null;
  }
}

/**
 * Updates submission status (usually called by AI analysis system)
 * @param {string} submissionId - Submission ID
 * @param {Object} updateData - Update data
 * @returns {Promise<SubmissionInfo | null>} Updated submission information
 */
export interface UpdateSubmissionOptions {
  aiAnalysisResult?: GradingResultData;
  finalScore?: number | null;
  normalizedScore?: number | null;
  usedContext?: UsedContext | null; // Feature 004: Context transparency
  teacherFeedback?: string | null;
  status?: 'SUBMITTED' | 'ANALYZED' | 'GRADED';
  thoughtSummary?: string | null; // Feature 005: AI Thinking Process
  thinkingProcess?: string | null; // Feature 012: Raw thinking process
  gradingRationale?: string | null; // Feature 012: Grading rationale
}

export async function updateSubmission(
  submissionId: string,
  updateData: UpdateSubmissionOptions
): Promise<SubmissionInfo | null> {
  try {
    // Convert UpdateSubmissionOptions to Prisma input
    // CRITICAL: We must differentiate between:
    // 1. Field not present (undefined) → Don't update
    // 2. Field explicitly null → Update to null
    // 3. Field with value → Update to value
    const prismaData: any = {};
    
    if ('aiAnalysisResult' in updateData) prismaData.aiAnalysisResult = updateData.aiAnalysisResult;
    if ('finalScore' in updateData) prismaData.finalScore = updateData.finalScore;
    if ('normalizedScore' in updateData) prismaData.normalizedScore = updateData.normalizedScore;
    if ('usedContext' in updateData) prismaData.usedContext = updateData.usedContext;
    if ('teacherFeedback' in updateData) prismaData.teacherFeedback = updateData.teacherFeedback;
    if ('status' in updateData) prismaData.status = updateData.status;
    if ('thoughtSummary' in updateData) prismaData.thoughtSummary = updateData.thoughtSummary;
    if ('thinkingProcess' in updateData) prismaData.thinkingProcess = updateData.thinkingProcess;
    if ('gradingRationale' in updateData) prismaData.gradingRationale = updateData.gradingRationale;

    const submission = await db.submission.update({
      where: { id: submissionId },
      data: prismaData,
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
    });

    return submission as SubmissionInfo;
  } catch (error) {
    console.error('❌ Error updating submission:', error);
    return null;
  }
}

// Draft submission interfaces and types
export interface DraftSubmissionData {
  assignmentAreaId: string;
  studentId: string;
  fileMetadata?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null;
  sessionId?: string | null;
  // Use Prisma's JsonValue type for proper JSON handling
  aiAnalysisResult?: Prisma.JsonValue | null;
  thoughtSummary?: string | null;
  thinkingProcess?: string | null;
  gradingRationale?: string | null;
  lastState?: 'idle' | 'ready' | 'grading' | 'completed' | 'sparring' | 'error';
}

export interface DraftSubmissionInfo extends DraftSubmissionData {
  id?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'ANALYZED' | 'GRADED';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Gets existing draft/submission for a student's assignment
 * Checks for both DRAFT status submissions and completed submissions
 * @param {string} assignmentAreaId - Assignment area ID
 * @param {string} studentId - Student's user ID
 * @returns {Promise<DraftSubmissionInfo | null>} Draft submission data or null
 */
export async function getDraftSubmission(
  assignmentAreaId: string,
  studentId: string
): Promise<DraftSubmissionInfo | null> {
  try {
    // First check for existing submissions (including completed ones for this assignment)
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentAreaId,
        studentId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
    });

    if (existingSubmission) {
      // Convert submission to draft format
      let fileMetadata = null;

      // Try to parse file metadata from filePath (could be fileId or other format)
      if (existingSubmission.filePath) {
        // If filePath looks like a UUID, treat it as fileId and get file details
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(existingSubmission.filePath)) {
          try {
            const uploadedFile = await db.uploadedFile.findUnique({
              where: { id: existingSubmission.filePath },
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
              },
            });

            if (uploadedFile) {
              fileMetadata = {
                fileId: uploadedFile.id,
                fileName: uploadedFile.fileName,
                fileSize: uploadedFile.fileSize,
                mimeType: uploadedFile.mimeType,
              };
            }
          } catch (e) {
            logger.warn({ err: e }, 'Could not resolve file metadata for submission:');
          }
        }
      }

      // Determine state based on submission status and AI result
      let lastState: DraftSubmissionData['lastState'] = 'idle';
      if (existingSubmission.status === 'ANALYZED' || existingSubmission.aiAnalysisResult) {
        lastState = 'completed';
      } else if (fileMetadata) {
        lastState = 'ready';
      }

      return {
        id: existingSubmission.id,
        assignmentAreaId,
        studentId,
        fileMetadata,
        sessionId: existingSubmission.sessionId ?? null,
        aiAnalysisResult: existingSubmission.aiAnalysisResult,
        thoughtSummary: existingSubmission.thoughtSummary,
        thinkingProcess: existingSubmission.thinkingProcess,
        gradingRationale: existingSubmission.gradingRationale,
        lastState,
        status: existingSubmission.status,
        createdAt: existingSubmission.createdAt,
        updatedAt: existingSubmission.updatedAt,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting draft submission:', error);
    return null;
  }
}

/**
 * Saves or updates draft submission data
 * Creates a new submission with DRAFT status or updates existing one
 * @param {DraftSubmissionData} draftData - Draft submission data
 * @returns {Promise<DraftSubmissionInfo | null>} Saved draft submission data
 */
export async function saveDraftSubmission(draftData: DraftSubmissionData): Promise<DraftSubmissionInfo | null> {
  try {
    const {
      assignmentAreaId,
      studentId,
      fileMetadata,
      sessionId,
      aiAnalysisResult,
      thoughtSummary,
      thinkingProcess,
      gradingRationale,
      lastState,
    } = draftData;

    // Check if submission already exists (get latest version)
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentAreaId,
        studentId,
      },
      orderBy: { version: 'desc' }, // Get latest version
    });

    let submission;

    if (existingSubmission) {
      // CRITICAL FIX: Check if existing submission is already submitted (not DRAFT)
      // If so, we need to create a new version instead of updating the existing one
      if (existingSubmission.status !== 'DRAFT') {
        logger.info(
          `📝 Existing submission is ${existingSubmission.status}, creating new version for student ${studentId}`
        );

        // Only create new version if we have file metadata
        if (!fileMetadata?.fileId) {
          logger.warn('Cannot create new version without file metadata');
          return null;
        }

        // Import version management function
        const { createNewSubmissionVersion } = await import('./version-management.server');

        // Create new DRAFT version
        const newVersion = await db.$transaction(async (tx) => {
          // Mark old version as not latest
          await tx.submission.update({
            where: { id: existingSubmission.id },
            data: { isLatest: false },
          });

          // Create new version with DRAFT status
          const nextVersionNumber = existingSubmission.version + 1;
          const newSubmission = await tx.submission.create({
            data: {
              student: { connect: { id: studentId } },
              assignmentArea: { connect: { id: assignmentAreaId } },
              filePath: fileMetadata.fileId,
              version: nextVersionNumber,
              isLatest: true,
              previousVersion: { connect: { id: existingSubmission.id } }, // Fixed: use relation name
              status: 'DRAFT',
              sessionId: sessionId ?? undefined,
              aiAnalysisResult: aiAnalysisResult ?? undefined,
              thoughtSummary: thoughtSummary ?? undefined,
              thinkingProcess: thinkingProcess ?? undefined,
              gradingRationale: gradingRationale ?? undefined,
            },
          });

          logger.info(
            `✅ Created new DRAFT version ${nextVersionNumber} for student ${studentId}, assignment ${assignmentAreaId}`
          );

          return newSubmission;
        });

        return {
          id: newVersion.id,
          assignmentAreaId,
          studentId,
          fileMetadata,
          sessionId,
          aiAnalysisResult: newVersion.aiAnalysisResult,
          thoughtSummary: newVersion.thoughtSummary,
          lastState,
          status: newVersion.status,
          createdAt: newVersion.createdAt,
          updatedAt: newVersion.updatedAt,
        };
      }

      // Existing submission is DRAFT - update it (original behavior)
      const updateData: any = {};

      // Update file path if new file metadata provided
      if (fileMetadata?.fileId) {
        updateData.filePath = fileMetadata.fileId;
      }

      // Update sessionId if provided
      if (sessionId !== undefined) {
        updateData.sessionId = sessionId ?? undefined;
      }

      // Update AI analysis result if provided
      if (aiAnalysisResult !== undefined) {
        updateData.aiAnalysisResult = aiAnalysisResult ?? undefined;
        // Keep status as DRAFT - AI result doesn't mean submission is complete
        // Status should only change to SUBMITTED when user explicitly submits
        // (Don't auto-change to ANALYZED - that's for submitted assignments only)
      }

      if (thoughtSummary !== undefined) {
        updateData.thoughtSummary = thoughtSummary ?? undefined;
      }

      if (thinkingProcess !== undefined) {
        updateData.thinkingProcess = thinkingProcess ?? undefined;
      }

      if (gradingRationale !== undefined) {
        updateData.gradingRationale = gradingRationale ?? undefined;
      }

      if (Object.keys(updateData).length > 0) {
        submission = await db.submission.update({
          where: { id: existingSubmission.id },
          data: updateData,
        });
      } else {
        submission = existingSubmission;
      }
    } else if (fileMetadata?.fileId) {
      // Create new submission only if we have file metadata
      // Build data object conditionally to avoid null vs undefined issues with Prisma
      const createData: Prisma.SubmissionCreateInput = {
        student: { connect: { id: studentId } },
        assignmentArea: { connect: { id: assignmentAreaId } },
        filePath: fileMetadata.fileId,
        status: 'DRAFT', // Always create as DRAFT - user hasn't submitted yet
      };

      // Only include optional fields if they have non-null values
      if (sessionId !== null && sessionId !== undefined) {
        createData.sessionId = sessionId;
      }
      if (aiAnalysisResult !== null && aiAnalysisResult !== undefined) {
        createData.aiAnalysisResult = aiAnalysisResult;
      }
      if (thoughtSummary !== null && thoughtSummary !== undefined) {
        createData.thoughtSummary = thoughtSummary;
      }
      if (thinkingProcess !== null && thinkingProcess !== undefined) {
        createData.thinkingProcess = thinkingProcess;
      }
      if (gradingRationale !== null && gradingRationale !== undefined) {
        createData.gradingRationale = gradingRationale;
      }

      submission = await db.submission.create({
        data: createData,
      });
    } else {
      // No file to save yet, return null
      return null;
    }

    logger.info({ submissionId: submission.id, assignmentAreaId, studentId }, '  Saved draft submission');

    return {
      id: submission.id,
      assignmentAreaId,
      studentId,
      fileMetadata,
      sessionId,
      aiAnalysisResult: submission.aiAnalysisResult,
      thoughtSummary: submission.thoughtSummary,
      lastState,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  } catch (error) {
    console.error('❌ Error saving draft submission:', error);
    return null;
  }
}

/**
 * Gets recent submissions for teacher dashboard (from teacher's courses)
 * @param {string} teacherId - Teacher's user ID
 * @param {number} limit - Optional maximum number of submissions to return (no limit if not provided)
 * @returns {Promise<SubmissionInfo[]>} List of recent submissions from teacher's courses
 */
export async function getRecentSubmissionsForTeacher(teacherId: string, limit?: number): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: {
        assignmentArea: {
          course: {
            teacherId: teacherId,
          },
        },
        status: { not: 'DRAFT' }, // Exclude draft submissions - students haven't submitted yet
        isDeleted: false, // Exclude deleted submissions
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
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    email: true
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: [{ uploadedAt: 'desc' }, { version: 'desc' }],
    });

    // Keep only the latest non-draft submission per (student, assignment).
    // This prevents empty dashboard results when the absolute latest version is a DRAFT.
    const latestByStudentAssignment = new Map<string, SubmissionInfo>();
    for (const submission of submissions) {
      const key = `${submission.studentId}:${submission.assignmentAreaId}`;
      if (!latestByStudentAssignment.has(key)) {
        latestByStudentAssignment.set(key, submission);
      }
    }

    const dedupedSubmissions = Array.from(latestByStudentAssignment.values());
    return limit ? dedupedSubmissions.slice(0, limit) : dedupedSubmissions;
  } catch (error) {
    console.error('❌ Error fetching recent submissions for teacher:', error);
    return [];
  }
}

/**
 * Deletes a submission by teacher (with authorization)
 * Uses soft delete strategy: marks record as deleted but immediately removes S3 file
 * This preserves version history integrity while freeing storage space
 * @param {string} submissionId - Submission ID to delete
 * @param {string} teacherId - Teacher's user ID for authorization
 * @returns {Promise<{ success: boolean; error?: string }>} Deletion result
 */
export async function deleteSubmissionByTeacher(
  submissionId: string,
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, verify that the teacher owns the course for this submission
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        assignmentArea: {
          course: {
            teacherId: teacherId,
          },
        },
      },
      select: {
        id: true,
        filePath: true,
        studentId: true,
        assignmentAreaId: true,
        isDeleted: true,
      },
    });

    if (!submission) {
      logger.warn({ submissionId, teacherId }, 'Submission not found or teacher unauthorized');
      return { 
        success: false, 
        error: 'Submission not found or you do not have permission to delete it' 
      };
    }

    // Check if already deleted
    if (submission.isDeleted) {
      return {
        success: false,
        error: 'This submission has already been deleted'
      };
    }

    // Delete the file from S3 storage (immediate cleanup to free space)
    try {
      await deleteFromStorage(submission.filePath);
      logger.info({ fileKey: submission.filePath }, 'Successfully deleted file from S3');
    } catch (storageError) {
      // Log the error but continue with soft delete
      // The file might already be deleted or the path might be invalid
      logger.warn(
        { error: storageError, fileKey: submission.filePath }, 
        'Failed to delete file from storage, continuing with soft delete'
      );
    }

    // Soft delete the submission in the database
    // This preserves version history and prevents cascade issues
    await db.submission.update({
      where: { id: submissionId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: teacherId,
      },
    });

    logger.info(
      { 
        submissionId, 
        teacherId, 
        studentId: submission.studentId,
        assignmentAreaId: submission.assignmentAreaId 
      }, 
      'Successfully soft deleted submission and removed S3 file'
    );

    return { success: true };
  } catch (error) {
    logger.error({ error, submissionId, teacherId }, 'Failed to delete submission');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete submission',
    };
  }
}
