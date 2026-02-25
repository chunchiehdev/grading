import { db, GradingSessionStatus, GradingStatus, type GradingSession, type GradingResult } from '@/types/database';
import logger from '@/utils/logger';
import { checkAIAccess } from '@/services/ai-access.server';

export interface CreateGradingSessionRequest {
  userId: string;
  filePairs: Array<{
    fileId: string;
    rubricId: string;
  }>;
  assignmentAreaId?: string; // Feature 004: Context transparency
  language?: string; // Feature 004: Language for context awareness
}

export interface GradingSessionWithResults extends GradingSession {
  gradingResults: (GradingResult & {
    uploadedFile: {
      fileName: string;
      originalFileName: string;
    };
    rubric: {
      name: string;
    };
  })[];
}

/**
 * Creates a new grading session with file-rubric pairings
 */
export async function createGradingSession(
  request: CreateGradingSessionRequest
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const { userId, filePairs, assignmentAreaId } = request;

    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Extract file and rubric IDs for validation
    const fileIds = filePairs.map((pair) => pair.fileId);
    const rubricIds = filePairs.map((pair) => pair.rubricId);

    // Check for duplicate rubric IDs
    const uniqueRubricIds = [...new Set(rubricIds)];
    logger.info({
      requestedRubricIds: rubricIds,
      uniqueRubricIds,
      hasDuplicates: rubricIds.length !== uniqueRubricIds.length,
    }, `Validating rubrics for user ${userId}:`);

    // Validate files exist and belong to user
    const files = await db.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        userId,
        parseStatus: 'COMPLETED',
      },
    });

    if (files.length !== fileIds.length) {
      const foundFileIds = files.map((f) => f.id);
      const missingFileIds = fileIds.filter((id) => !foundFileIds.includes(id));
      logger.error({ missingFileIds, foundFileIds }, `Missing files for user ${userId}:`);
      return { success: false, error: 'Some files not found or not ready for grading' };
    }

    // Validate rubrics exist and are active (can be from any user - shared access)
    const rubrics = await db.rubric.findMany({
      where: {
        id: { in: uniqueRubricIds },
        isActive: true,
      },
    });

    logger.info({
      foundRubrics: rubrics.map((r) => ({ id: r.id, name: r.name, isActive: r.isActive })),
      requestedCount: uniqueRubricIds.length,
      foundCount: rubrics.length,
    }, `Found rubrics for user ${userId}:`);

    if (rubrics.length !== uniqueRubricIds.length) {
      const foundRubricIds = rubrics.map((r) => r.id);
      const missingRubricIds = uniqueRubricIds.filter((id) => !foundRubricIds.includes(id));

      // Check if missing rubrics exist but are inactive
      const allMatchingRubrics = await db.rubric.findMany({
        where: { id: { in: missingRubricIds } },
        select: { id: true, userId: true, isActive: true, name: true },
      });

      logger.error({
        missingRubricIds,
        foundRubricIds,
        allMatchingRubrics,
      }, `Missing rubrics for user ${userId}:`);

      return {
        success: false,
        error: `評分標準驗證失敗：找不到 ${missingRubricIds.length} 個評分標準或它們不是活躍狀態`,
      };
    }

    // Create grading session with results in a transaction
    const result = await db.$transaction(async (prisma) => {
      // Create session
      const session = await prisma.gradingSession.create({
        data: {
          userId,
          status: GradingSessionStatus.PENDING,
          progress: 0,
        },
      });

      // Create grading results for each file-rubric pair
      const gradingResults = [];
      for (const pair of filePairs) {
        const gradingResult = await prisma.gradingResult.create({
          data: {
            gradingSessionId: session.id,
            uploadedFileId: pair.fileId,
            rubricId: pair.rubricId,
            // Feature 004: Store assignmentAreaId for context-aware grading
            assignmentAreaId: assignmentAreaId || null,
            status: GradingStatus.PENDING,
            progress: 0,
          },
        });
        gradingResults.push(gradingResult);
      }

      return { session, gradingResults };
    });

    logger.info(`Created grading session ${result.session.id} with ${result.gradingResults.length} grading tasks`);

    return {
      success: true,
      sessionId: result.session.id,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to create grading session:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create grading session',
    };
  }
}

/**
 * Gets a grading session with all its results
 */
export async function getGradingSession(
  sessionId: string,
  userId: string
): Promise<{ session?: GradingSessionWithResults; error?: string }> {
  try {
    const session = await db.gradingSession.findUnique({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        gradingResults: {
          include: {
            uploadedFile: {
              select: {
                fileName: true,
                originalFileName: true,
              },
            },
            rubric: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return { error: 'Grading session not found' };
    }

    return { session: session as GradingSessionWithResults };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get grading session:');
    return {
      error: error instanceof Error ? error.message : 'Failed to get grading session',
    };
  }
}

/**
 * Lists all grading sessions for a user
 */
export async function listGradingSessions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ sessions: GradingSessionWithResults[]; total: number; error?: string }> {
  try {
    const [sessions, total] = await Promise.all([
      db.gradingSession.findMany({
        where: { userId },
        include: {
          gradingResults: {
            include: {
              uploadedFile: {
                select: {
                  fileName: true,
                  originalFileName: true,
                },
              },
              rubric: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.gradingSession.count({
        where: { userId },
      }),
    ]);

    return {
      sessions: sessions as GradingSessionWithResults[],
      total,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to list grading sessions:');
    return {
      sessions: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to list grading sessions',
    };
  }
}

/**
 * Lists ALL grading sessions from all users (shared/public view)
 */
export async function listAllGradingSessions(
  limit: number = 20,
  offset: number = 0
): Promise<{ sessions: GradingSessionWithResults[]; total: number; error?: string }> {
  try {
    const [sessions, total] = await Promise.all([
      db.gradingSession.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          gradingResults: {
            include: {
              uploadedFile: {
                select: {
                  fileName: true,
                  originalFileName: true,
                },
              },
              rubric: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.gradingSession.count(),
    ]);

    return {
      sessions: sessions as GradingSessionWithResults[],
      total,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to list all grading sessions:');
    return {
      sessions: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to list all grading sessions',
    };
  }
}

/**
 * Gets any grading session by ID (shared/public access - no user restriction)
 */
export async function getAnyGradingSession(
  sessionId: string
): Promise<{ session?: GradingSessionWithResults; error?: string }> {
  try {
    const session = await db.gradingSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        gradingResults: {
          include: {
            uploadedFile: {
              select: {
                fileName: true,
                originalFileName: true,
              },
            },
            rubric: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return { error: 'Grading session not found' };
    }

    return { session: session as GradingSessionWithResults };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get any grading session:');
    return {
      error: error instanceof Error ? error.message : 'Failed to get grading session',
    };
  }
}

/**
 * Updates grading session status and progress
 */
export async function updateGradingSessionProgress(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all grading results for this session
    const results = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        gradingSession: { userId },
      },
    });

    if (results.length === 0) {
      return { success: false, error: 'No grading results found' };
    }

    // Calculate overall progress
    const completedCount = results.filter((r) => r.status === GradingStatus.COMPLETED).length;
    const failedCount = results.filter((r) => r.status === GradingStatus.FAILED).length;
    const processingCount = results.filter((r) => r.status === GradingStatus.PROCESSING).length;

    const overallProgress = Math.round((completedCount / results.length) * 100);

    // Determine session status
    let sessionStatus: GradingSessionStatus;
    if (completedCount === results.length) {
      sessionStatus = GradingSessionStatus.COMPLETED;
    } else if (failedCount > 0 && processingCount === 0 && completedCount + failedCount === results.length) {
      sessionStatus = GradingSessionStatus.FAILED;
    } else if (processingCount > 0 || completedCount > 0) {
      sessionStatus = GradingSessionStatus.PROCESSING;
    } else {
      sessionStatus = GradingSessionStatus.PENDING;
    }

    // Update session
    await db.gradingSession.update({
      where: { id: sessionId },
      data: {
        status: sessionStatus,
        progress: overallProgress,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Failed to update grading session progress:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress',
    };
  }
}

/**
 * 把這次評分（sessionId）的狀態改成「處理中」
 * 找出這場裡所有還沒評分的項目（狀態是 PENDING）
 * 如果沒東西要評，直接回傳成功
 * 如果有，要載入一個評分服務，把每個待評項目加進評分任務去做排隊
 * 如果加任務失敗，就標記程式為「失敗」，並回傳錯誤訊息
 * 如果成功，就記錄一下並回傳成功
 * 中途如果出錯，會捕捉錯誤並回傳失敗
 */
export async function startGradingSession(
  sessionId: string,
  userId: string,
  userLanguage: 'zh' | 'en' = 'zh',
  useDirectGrading: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check AI access permission before starting grading
    const aiAccess = await checkAIAccess(userId);
    if (!aiAccess.allowed) {
      logger.warn({ userId, sessionId, reason: aiAccess.reason }, '[GradingSession] AI access denied');
      return {
        success: false,
        error: aiAccess.reason || 'AI 功能尚未開啟。請聯繫管理員啟用您的 AI 存取權限。',
      };
    }

    // Update session status to processing
    await db.gradingSession.update({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        status: GradingSessionStatus.PROCESSING,
      },
    });

    // Get all pending results for this session
    const pendingResults = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        status: 'PENDING',
      },
      select: {
        id: true,
      },
    });

    if (pendingResults.length === 0) {
      return { success: true };
    }

    // Use BullMQ grading service (distributed, Redis-backed, with global rate limiting)
    const { gradingQueue } = await import('./queue.server');

    const gradingJobs = pendingResults.map((result) => ({
      name: 'grade-submission',
      data: {
        resultId: result.id,
        userId: userId,
        sessionId: sessionId,
        userLanguage: userLanguage,
        useDirectGrading,
      },
      opts: {
        jobId: `grade-${result.id}`,
      }
    }));

    await gradingQueue.addBulk(gradingJobs);

    logger.info(`🚀 Started grading session ${sessionId} with ${gradingJobs.length} jobs`);

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Failed to start grading session:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start grading',
    };
  }
}

/**
 * Cancels a grading session
 */
export async function cancelGradingSession(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.gradingSession.update({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        status: GradingSessionStatus.CANCELLED,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Failed to cancel grading session:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel grading session',
    };
  }
}
