import { db } from '@/types/database';
import type { SubmissionInfo } from '@/types/student';
import logger from '@/utils/logger';

/**
 * Version Management Service for Submission History
 * Handles version tracking, querying, and comparison for student submissions
 */

export interface SubmissionVersion {
  id: string;
  version: number;
  isLatest: boolean;
  submittedAt: Date;
  status: string;
  finalScore?: number | null;
  normalizedScore?: number | null;
  filePath: string;
  previousVersionId?: string | null;
}

export interface VersionComparison {
  versionA: {
    version: number;
    submittedAt: Date;
    submission: SubmissionInfo;
  };
  versionB: {
    version: number;
    submittedAt: Date;
    submission: SubmissionInfo;
  };
  differences: {
    timeDiff: string;
    fileChanged: boolean;
    fileSizeDiff?: number;
  };
  aiAnalysis?: {
    scoreChanges: Array<{
      criterion: string;
      oldScore: number;
      newScore: number;
      change: number;
    }>;
    overallChange: number;
  };
  grading?: {
    oldScore?: number;
    newScore?: number;
    change?: number;
  };
}

/**
 * Get the latest submission version for a student and assignment
 */
export async function getLatestSubmissionVersion(
  assignmentAreaId: string,
  studentId: string
): Promise<SubmissionInfo | null> {
  try {
    const latestSubmission = await db.submission.findFirst({
      where: {
        assignmentAreaId,
        studentId,
        isLatest: true,
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
            email: true,
            name: true,
            picture: true,
          },
        },
      },
    });

    return latestSubmission;
  } catch (error) {
    logger.error('❌ Error fetching latest submission version:', error);
    return null;
  }
}

/**
 * Get all submission versions for a student and assignment
 * @returns Array of submissions ordered by version (newest first)
 */
export async function getSubmissionHistory(
  assignmentAreaId: string,
  studentId: string
): Promise<SubmissionInfo[]> {
  try {
    const submissions = await db.submission.findMany({
      where: {
        assignmentAreaId,
        studentId,
        status: { not: 'DRAFT' }, // Exclude drafts - only show actually submitted versions
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
            email: true,
            name: true,
            picture: true,
          },
        },
      },
      orderBy: { version: 'desc' }, // Newest first
    });

    return submissions;
  } catch (error) {
    logger.error('❌ Error fetching submission history:', error);
    return [];
  }
}

/**
 * Get a specific version of a submission
 */
export async function getSubmissionByVersion(
  assignmentAreaId: string,
  studentId: string,
  version: number
): Promise<SubmissionInfo | null> {
  try {
    const submission = await db.submission.findFirst({
      where: {
        assignmentAreaId,
        studentId,
        version,
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
            email: true,
            name: true,
            picture: true,
          },
        },
      },
    });

    return submission;
  } catch (error) {
    logger.error('❌ Error fetching submission by version:', error);
    return null;
  }
}

/**
 * Get version count for a student's assignment submission
 */
export async function getVersionCount(assignmentAreaId: string, studentId: string): Promise<number> {
  try {
    const count = await db.submission.count({
      where: {
        assignmentAreaId,
        studentId,
      },
    });

    return count;
  } catch (error) {
    logger.error('❌ Error counting submission versions:', error);
    return 0;
  }
}

/**
 * Create a new version of a submission
 * This marks the previous version as no longer latest and creates a new version
 */
export async function createNewSubmissionVersion(
  studentId: string,
  assignmentAreaId: string,
  filePath: string,
  previousSubmissionId?: string
): Promise<SubmissionInfo> {
  try {
    // Get the latest version to determine the next version number
    const latestVersion = await getLatestSubmissionVersion(assignmentAreaId, studentId);

    const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Start a transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // If there's a previous version, mark it as no longer latest
      if (latestVersion) {
        await tx.submission.update({
          where: { id: latestVersion.id },
          data: { isLatest: false },
        });
      }

      // Create new version
      const newSubmission = await tx.submission.create({
        data: {
          studentId,
          assignmentAreaId,
          filePath,
          version: nextVersionNumber,
          isLatest: true,
          previousVersionId: previousSubmissionId || latestVersion?.id || null,
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
              email: true,
              name: true,
              picture: true,
            },
          },
        },
      });

      return newSubmission;
    });

    logger.info(`✅ Created submission version ${nextVersionNumber} for student ${studentId}`);
    return result;
  } catch (error) {
    logger.error('❌ Error creating new submission version:', error);
    throw error;
  }
}

/**
 * Compare two submission versions
 */
export async function compareSubmissionVersions(
  submissionIdA: string,
  submissionIdB: string
): Promise<VersionComparison | null> {
  try {
    // Fetch both submissions
    const [submissionA, submissionB] = await Promise.all([
      db.submission.findUnique({
        where: { id: submissionIdA },
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
          student: {
            select: {
              id: true,
              email: true,
              name: true,
              picture: true,
            },
          },
        },
      }),
      db.submission.findUnique({
        where: { id: submissionIdB },
        include: {
          assignmentArea: {
            include: {
              course: true,
              rubric: true,
            },
          },
          student: {
            select: {
              id: true,
              email: true,
              name: true,
              picture: true,
            },
          },
        },
      }),
    ]);

    if (!submissionA || !submissionB) {
      throw new Error('One or both submissions not found');
    }

    // Verify both submissions belong to the same student and assignment
    if (
      submissionA.studentId !== submissionB.studentId ||
      submissionA.assignmentAreaId !== submissionB.assignmentAreaId
    ) {
      throw new Error('Submissions must belong to the same student and assignment');
    }

    // Calculate time difference
    const timeDiffMs = Math.abs(submissionB.uploadedAt.getTime() - submissionA.uploadedAt.getTime());
    const timeDiffHours = Math.floor(timeDiffMs / (1000 * 60 * 60));
    const timeDiffMinutes = Math.floor((timeDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeDiff =
      timeDiffHours > 0 ? `${timeDiffHours}小時${timeDiffMinutes}分鐘` : `${timeDiffMinutes}分鐘`;

    // Basic differences
    const differences = {
      timeDiff,
      fileChanged: submissionA.filePath !== submissionB.filePath,
    };

    // AI Analysis comparison (if both have AI results)
    let aiAnalysis;
    if (submissionA.aiAnalysisResult && submissionB.aiAnalysisResult) {
      const resultA = submissionA.aiAnalysisResult as any;
      const resultB = submissionB.aiAnalysisResult as any;

      const scoreChanges = [];
      if (resultA.breakdown && resultB.breakdown && Array.isArray(resultA.breakdown)) {
        for (let i = 0; i < resultA.breakdown.length; i++) {
          const criterionA = resultA.breakdown[i];
          const criterionB = resultB.breakdown[i];

          if (criterionA && criterionB) {
            scoreChanges.push({
              criterion: criterionA.criteriaName || `評分項目 ${i + 1}`,
              oldScore: criterionA.score || 0,
              newScore: criterionB.score || 0,
              change: (criterionB.score || 0) - (criterionA.score || 0),
            });
          }
        }
      }

      const oldTotal = resultA.totalScore || 0;
      const newTotal = resultB.totalScore || 0;

      aiAnalysis = {
        scoreChanges,
        overallChange: newTotal - oldTotal,
      };
    }

    // Grading comparison
    let grading;
    if (submissionA.finalScore !== null || submissionB.finalScore !== null) {
      grading = {
        oldScore: submissionA.finalScore ?? undefined,
        newScore: submissionB.finalScore ?? undefined,
        change:
          submissionA.finalScore !== null && submissionB.finalScore !== null
            ? submissionB.finalScore - submissionA.finalScore
            : undefined,
      };
    }

    return {
      versionA: {
        version: submissionA.version,
        submittedAt: submissionA.uploadedAt,
        submission: submissionA as any as SubmissionInfo,
      },
      versionB: {
        version: submissionB.version,
        submittedAt: submissionB.uploadedAt,
        submission: submissionB as any as SubmissionInfo,
      },
      differences,
      aiAnalysis,
      grading,
    };
  } catch (error) {
    logger.error('❌ Error comparing submission versions:', error);
    return null;
  }
}
