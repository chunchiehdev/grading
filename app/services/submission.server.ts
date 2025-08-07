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
 * Gets all available assignments for a student (assignment areas they can submit to)
 * Note: In a real system, you'd typically have enrollment/access control
 * For now, we'll show all assignment areas from all courses
 * @param {string} studentId - The student's user ID
 * @returns {Promise<StudentAssignmentInfo[]>} List of available assignments
 */
export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentInfo[]> {
  try {
    const assignmentAreas = await db.assignmentArea.findMany({
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

/**
 * Gets assignment area details for submission (public info)
 * @param {string} assignmentAreaId - Assignment area ID
 * @returns {Promise<StudentAssignmentInfo | null>} Assignment area information
 */
export async function getAssignmentAreaForSubmission(assignmentAreaId: string): Promise<StudentAssignmentInfo | null> {
  try {
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: assignmentAreaId },
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
    });

    if (!assignmentArea) {
      return null;
    }

    // Transform to match StudentAssignmentInfo interface
    return {
      ...assignmentArea,
      submissions: [], // Empty array for this specific use case
    };
  } catch (error) {
    console.error('❌ Error fetching assignment area:', error);
    return null;
  }
} 