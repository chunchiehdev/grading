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
  class?: {
    id: string;
    name: string;
  } | null;
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
 * Creates a submission and links it to an existing AI grading result.
 */
export async function createSubmissionAndLinkGradingResult(
  studentId: string,
  assignmentAreaId: string,
  filePathOrId: string,
  sessionId: string
): Promise<{ submissionId: string }> {
  // Check if submission already exists to prevent duplicates
  const existingSubmission = await db.submission.findFirst({
    where: {
      studentId,
      assignmentAreaId,
    },
    orderBy: { createdAt: 'desc' },
  });

  let submission: any;

  if (existingSubmission) {
    console.log(`📝 Found existing submission ${existingSubmission.id} for student ${studentId} and assignment ${assignmentAreaId}, returning existing submission`);
    submission = existingSubmission;
  } else {
    submission = await createSubmission(studentId, {
      assignmentAreaId,
      filePath: filePathOrId,
    });
    console.log(`✅ Created new submission ${submission.id}`);
  }

  if (!sessionId) {
    console.warn(`Submission ${submission.id} created without a sessionId. AI result will not be linked.`);
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
      const aiAnalysisResult = gradingResult.result as any;
      const finalScore = typeof aiAnalysisResult.totalScore === 'number'
        ? Math.round(aiAnalysisResult.totalScore)
        : null;

      console.log(`🔗 Linking AI result to submission ${submission.id}: totalScore=${aiAnalysisResult.totalScore}, finalScore=${finalScore}`);

      await updateSubmission(submission.id, {
        aiAnalysisResult: aiAnalysisResult,
        finalScore: finalScore ?? undefined,
        status: 'ANALYZED',
      });

      console.log(`✅ Successfully linked AI result to submission ${submission.id}`);
    } else {
      console.warn(`⚠️ Could not find a completed grading result for session ${sessionId} to link to submission ${submission.id}.`);
      console.warn(`   Session exists: ${sessionId ? 'Yes' : 'No'}`);
      console.warn(`   Grading result found: ${gradingResult ? 'Yes' : 'No'}`);
      if (gradingResult) {
        console.warn(`   Result has data: ${gradingResult.result ? 'Yes' : 'No'}`);
      }
    }
  } catch (error) {
    console.error(`Error linking AI analysis for submission ${submission.id}:`, error);
  }

  return { submissionId: submission.id };
}


/**
 * Gets all available assignments for a student (assignment areas they can submit to)
 * Only shows assignments from courses the student is enrolled in
 * @param {string} studentId - The student's user ID
 * @returns {Promise<StudentAssignmentInfo[]>} List of available assignments
 */
export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentInfo[]> {
  try {
    // Get all enrollments with class information
    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      select: {
        courseId: true,
        classId: true,
      },
    });

    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);
    const enrolledClassIds = enrollments.map(enrollment => enrollment.classId).filter(Boolean) as string[];

    if (enrolledCourseIds.length === 0) {
      // Student is not enrolled in any courses
      return [];
    }

    // Query assignments that either:
    // 1. Belong to student's classes (classId IN enrolledClassIds)
    // 2. OR are course-wide (classId = NULL AND courseId IN enrolledCourseIds)
    const assignmentAreas = await db.assignmentArea.findMany({
      where: {
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
            status: { not: 'DRAFT' }  // Exclude draft submissions
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
                        picture: true,
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
export async function getAssignmentAreaForSubmission(assignmentId: string, studentId?: string, includeSubmissions: boolean = false) {
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
          },
        },
        ...(includeSubmissions && studentId ? {
          submissions: {
            where: {
              studentId,
              status: { not: 'DRAFT' }
            },
            select: {
              id: true,
              status: true,
              uploadedAt: true,
            }
          }
        } : {}),
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
      where: {
        studentId,
        status: { not: 'DRAFT' }  // Exclude draft submissions from dashboard
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
      where: {
        studentId,
        status: { not: 'DRAFT' }  // Exclude draft submissions from dashboard
      },
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
 * Gets a specific submission for teacher viewing (teacher authorization required)
 * @param {string} submissionId - Submission ID
 * @param {string} teacherId - Teacher's user ID for authorization
 * @returns {Promise<SubmissionInfo | null>} Submission information or null if not found/unauthorized
 */
export async function getSubmissionByIdForTeacher(submissionId: string, teacherId: string): Promise<SubmissionInfo | null> {
  try {
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        assignmentArea: {
          course: {
            teacherId: teacherId, // Ensure teacher owns the course
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
                  select: { email: true },
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
  aiAnalysisResult?: any | null;
  lastState?: 'idle' | 'ready' | 'grading' | 'completed' | 'error';
}

export interface DraftSubmissionInfo extends DraftSubmissionData {
  id?: string;
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
            console.warn('Could not resolve file metadata for submission:', e);
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
        sessionId: null, // We don't store sessionId in submissions currently
        aiAnalysisResult: existingSubmission.aiAnalysisResult,
        lastState,
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
export async function saveDraftSubmission(
  draftData: DraftSubmissionData
): Promise<DraftSubmissionInfo | null> {
  try {
    const { assignmentAreaId, studentId, fileMetadata, sessionId, aiAnalysisResult, lastState } = draftData;

    // Check if submission already exists
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentAreaId,
        studentId,
      },
      orderBy: { createdAt: 'desc' },
    });

    let submission;

    if (existingSubmission) {
      // Update existing submission
      const updateData: any = {};
      
      // Update file path if new file metadata provided
      if (fileMetadata?.fileId) {
        updateData.filePath = fileMetadata.fileId;
      }
      
      // Update AI analysis result if provided
      if (aiAnalysisResult !== undefined) {
        updateData.aiAnalysisResult = aiAnalysisResult;
        // Update status based on AI result presence
        updateData.status = aiAnalysisResult ? 'ANALYZED' : 'DRAFT';
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
      submission = await db.submission.create({
        data: {
          studentId,
          assignmentAreaId,
          filePath: fileMetadata.fileId,
          status: aiAnalysisResult ? 'ANALYZED' : 'DRAFT',
          aiAnalysisResult: aiAnalysisResult || null,
        },
      });
    } else {
      // No file to save yet, return null
      return null;
    }

    console.log('✅ Saved draft submission:', submission.id);
    
    return {
      id: submission.id,
      assignmentAreaId,
      studentId,
      fileMetadata,
      sessionId,
      aiAnalysisResult: submission.aiAnalysisResult,
      lastState,
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
 * @param {number} limit - Maximum number of submissions to return (default: 10)
 * @returns {Promise<SubmissionInfo[]>} List of recent submissions from teacher's courses
 */
export async function getRecentSubmissionsForTeacher(teacherId: string, limit: number = 10): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: {
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
                  select: { email: true },
                },
              },
            },
            rubric: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
    });

    return submissions;
  } catch (error) {
    console.error('❌ Error fetching recent submissions for teacher:', error);
    return [];
  }
}

