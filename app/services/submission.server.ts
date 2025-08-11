import { db } from '@/lib/db.server';

export interface SubmissionInfo {
  id: string;
  studentId: string;
  assignmentAreaId: string;
  filePath: string;
  uploadedAt: Date;
  aiAnalysisResult: any | null;
  finalScore: number | null;
  teacherFeedback: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  assignmentArea: {
    id: string;
    name: string;
    description: string | null;
    dueDate: Date | null;
    course: {
      id: string;
      name: string;
      teacher: {
        email: string;
      };
    };
    rubric: {
      id: string;
      name: string;
      description: string;
      criteria: any;
    };
  };
}

export interface CreateSubmissionData {
  assignmentAreaId: string;
  filePath: string;
}

export interface StudentAssignmentInfo {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  courseId: string;
  course: {
    id: string;
    name: string;
    teacher: {
      email: string;
    };
  };
  rubric: {
    id: string;
    name: string;
    description: string;
    criteria: any;
  };
  submissions: SubmissionInfo[];
}

/**
 * Creates a new submission for a student
 * @param {string} studentId - The student's user ID
 * @param {CreateSubmissionData} submissionData - Submission creation data
 * @returns {Promise<SubmissionInfo>} Created submission information
 */
export async function createSubmission(studentId: string, submissionData: CreateSubmissionData): Promise<SubmissionInfo> {
  try {
    // Verify the assignment area exists
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: submissionData.assignmentAreaId },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
        rubric: true,
      },
    });

    if (!assignmentArea) {
      throw new Error('Assignment area not found');
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

    console.log('✅ Created submission:', submission.id, 'for student:', studentId);
    return submission;
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    throw error;
  }
}

/**
 * Creates a submission and attempts to start AI grading automatically.
 * Tries to link to an existing UploadedFile belonging to the student using the provided filePath
 * (interpreted as either an uploaded file ID or storage key). If found and parsed, creates a
 * GradingSession with a single GradingResult using the assignment's rubric, and starts processing.
 * Returns identifiers for client-side polling.
 */
export async function createSubmissionAndGrade(
  studentId: string,
  assignmentAreaId: string,
  filePathOrId: string
): Promise<{ submissionId: string; gradingSessionId?: string }> {
  // 1) Create the submission record first
  const submission = await createSubmission(studentId, {
    assignmentAreaId,
    filePath: filePathOrId,
  });

  // 2) Retrieve rubricId from assignment area
  const assignmentArea = await db.assignmentArea.findUnique({
    where: { id: assignmentAreaId },
    select: { rubricId: true },
  });

  if (!assignmentArea?.rubricId) {
    return { submissionId: submission.id };
  }

  // 3) Try to resolve an UploadedFile for this student based on the provided file token
  // We accept either an explicit uploaded file ID or the storage key
  const uploadedFile = await db.uploadedFile.findFirst({
    where: {
      userId: studentId,
      parseStatus: 'COMPLETED',
      OR: [
        { id: filePathOrId },
        { fileKey: filePathOrId },
      ],
    },
    select: { id: true },
  });

  if (!uploadedFile) {
    // Could not link to a parsed upload; grading session not started
    return { submissionId: submission.id };
  }

  // 4) Create a grading session + result for this single file/rubric pair
  const { createGradingSession, startGradingSession } = await import('./grading-session.server');
  const sessionRes = await createGradingSession({
    userId: studentId,
    filePairs: [
      {
        fileId: uploadedFile.id,
        rubricId: assignmentArea.rubricId,
      },
    ],
  });

  if (!sessionRes.success || !sessionRes.sessionId) {
    return { submissionId: submission.id };
  }

  // 5) Kick off background grading for this session
  await startGradingSession(sessionRes.sessionId, studentId);

  return { submissionId: submission.id, gradingSessionId: sessionRes.sessionId };
}

/**
 * Gets all available assignments for a student (assignment areas they can submit to)
 * Only shows assignments from courses the student is enrolled in
 * @param {string} studentId - The student's user ID
 * @returns {Promise<StudentAssignmentInfo[]>} List of available assignments
 */
export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentInfo[]> {
  try {
    // First get all courses the student is enrolled in
    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      select: { courseId: true },
    });

    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);

    if (enrolledCourseIds.length === 0) {
      // Student is not enrolled in any courses
      return [];
    }

    const assignmentAreas = await db.assignmentArea.findMany({
      where: {
        courseId: {
          in: enrolledCourseIds,
        },
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                email: true,
              },
            },
          },
        },
        rubric: true,
        submissions: {
          where: {
            studentId,
          },
          include: {
            assignmentArea: {
              include: {
                course: {
                  include: {
                    teacher: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
                rubric: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return assignmentAreas;
  } catch (error) {
    console.error('❌ Error fetching student assignments:', error);
    return [];
  }
}

/**
 * Lists submissions for an assignment area (teacher view)
 * @param assignmentId - Assignment area ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of submissions with student info
 */
export async function listSubmissionsByAssignment(
  assignmentId: string, 
  teacherId: string
): Promise<SubmissionInfo[]> {
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
      where: { assignmentAreaId: assignmentId },
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
      orderBy: { uploadedAt: 'desc' },
    });

    return submissions;
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
export async function getAssignmentAreaForSubmission(assignmentId: string, studentId?: string) {
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
              },
            },
          },
        },
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!assignmentArea) {
      return null;
    }

    // If studentId provided, check enrollment
    if (studentId) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: assignmentArea.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('Student is not enrolled in this course');
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
 * @param {string} studentId - The student's user ID
 * @returns {Promise<SubmissionInfo[]>} List of student's submissions
 */
export async function getStudentSubmissions(studentId: string): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: { studentId },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
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
      where: { studentId },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: { email: true },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
    return submissions;
  } catch (error) {
    console.error('❌ Error fetching submissions by student:', error);
    return [];
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
      },
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
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
export async function updateSubmission(
  submissionId: string, 
  updateData: {
    aiAnalysisResult?: any;
    finalScore?: number;
    teacherFeedback?: string;
    status?: 'SUBMITTED' | 'ANALYZED' | 'GRADED';
  }
): Promise<SubmissionInfo | null> {
  try {
    const submission = await db.submission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        assignmentArea: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
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
    console.error('❌ Error updating submission:', error);
    return null;
  }
}
