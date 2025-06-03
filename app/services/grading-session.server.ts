import { db, GradingSessionStatus, GradingStatus, type GradingSession, type GradingResult } from '@/types/database';
import logger from '@/utils/logger';

export interface CreateGradingSessionRequest {
  userId: string;
  filePairs: Array<{
    fileId: string;
    rubricId: string;
  }>;
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
    const { userId, filePairs } = request;

    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Extract file and rubric IDs for validation
    const fileIds = filePairs.map(pair => pair.fileId);
    const rubricIds = filePairs.map(pair => pair.rubricId);

    // Check for duplicate rubric IDs
    const uniqueRubricIds = [...new Set(rubricIds)];
    logger.info(`Validating rubrics for user ${userId}:`, {
      requestedRubricIds: rubricIds,
      uniqueRubricIds,
      hasDuplicates: rubricIds.length !== uniqueRubricIds.length
    });

    // Validate files exist and belong to user
    const files = await db.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        userId,
        parseStatus: 'COMPLETED'
      }
    });

    if (files.length !== fileIds.length) {
      const foundFileIds = files.map(f => f.id);
      const missingFileIds = fileIds.filter(id => !foundFileIds.includes(id));
      logger.error(`Missing files for user ${userId}:`, { missingFileIds, foundFileIds });
      return { success: false, error: 'Some files not found or not ready for grading' };
    }

    // Validate rubrics exist and belong to user
    const rubrics = await db.rubric.findMany({
      where: {
        id: { in: uniqueRubricIds },
        userId,
        isActive: true
      }
    });

    logger.info(`Found rubrics for user ${userId}:`, {
      foundRubrics: rubrics.map(r => ({ id: r.id, name: r.name, isActive: r.isActive })),
      requestedCount: uniqueRubricIds.length,
      foundCount: rubrics.length
    });

    if (rubrics.length !== uniqueRubricIds.length) {
      const foundRubricIds = rubrics.map(r => r.id);
      const missingRubricIds = uniqueRubricIds.filter(id => !foundRubricIds.includes(id));
      
      // Check if missing rubrics exist but are inactive or belong to other users
      const allMatchingRubrics = await db.rubric.findMany({
        where: { id: { in: missingRubricIds } },
        select: { id: true, userId: true, isActive: true, name: true }
      });
      
      logger.error(`Missing rubrics for user ${userId}:`, {
        missingRubricIds,
        foundRubricIds,
        allMatchingRubrics
      });
      
      return { 
        success: false, 
        error: `評分標準驗證失敗：找不到 ${missingRubricIds.length} 個評分標準或它們不是活躍狀態` 
      };
    }

    // Create grading session with results in a transaction
    const result = await db.$transaction(async (prisma) => {
      // Create session
      const session = await prisma.gradingSession.create({
        data: {
          userId,
          status: GradingSessionStatus.PENDING,
          progress: 0
        }
      });

      // Create grading results for each file-rubric pair
      const gradingResults = [];
      for (const pair of filePairs) {
        const gradingResult = await prisma.gradingResult.create({
          data: {
            gradingSessionId: session.id,
            uploadedFileId: pair.fileId,
            rubricId: pair.rubricId,
            status: GradingStatus.PENDING,
            progress: 0
          }
        });
        gradingResults.push(gradingResult);
      }

      return { session, gradingResults };
    });

    logger.info(`Created grading session ${result.session.id} with ${result.gradingResults.length} grading tasks`);

    return {
      success: true,
      sessionId: result.session.id
    };
  } catch (error) {
    logger.error('Failed to create grading session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create grading session'
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
        userId
      },
      include: {
        gradingResults: {
          include: {
            uploadedFile: {
              select: {
                fileName: true,
                originalFileName: true
              }
            },
            rubric: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return { error: 'Grading session not found' };
    }

    return { session: session as GradingSessionWithResults };
  } catch (error) {
    logger.error('Failed to get grading session:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get grading session'
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
                  originalFileName: true
                }
              },
              rubric: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.gradingSession.count({
        where: { userId }
      })
    ]);

    return {
      sessions: sessions as GradingSessionWithResults[],
      total
    };
  } catch (error) {
    logger.error('Failed to list grading sessions:', error);
    return {
      sessions: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to list grading sessions'
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
        gradingSession: { userId }
      }
    });

    if (results.length === 0) {
      return { success: false, error: 'No grading results found' };
    }

    // Calculate overall progress
    const completedCount = results.filter(r => r.status === GradingStatus.COMPLETED).length;
    const failedCount = results.filter(r => r.status === GradingStatus.FAILED).length;
    const processingCount = results.filter(r => r.status === GradingStatus.PROCESSING).length;
    
    const overallProgress = Math.round((completedCount / results.length) * 100);
    
    // Determine session status
    let sessionStatus: GradingSessionStatus;
    if (completedCount === results.length) {
      sessionStatus = GradingSessionStatus.COMPLETED;
    } else if (failedCount > 0 && processingCount === 0 && (completedCount + failedCount) === results.length) {
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
        progress: overallProgress
      }
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update grading session progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress'
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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update session status to processing
    await db.gradingSession.update({
      where: {
        id: sessionId,
        userId
      },
      data: {
        status: GradingSessionStatus.PROCESSING
      }
    });

    // Get all pending results for this session
    const pendingResults = await db.gradingResult.findMany({
      where: {
        gradingSessionId: sessionId,
        status: 'PENDING'
      },
      select: {
        id: true
      }
    });

    if (pendingResults.length === 0) {
      return { success: true };
    }

    // Use simple grading service 
    const { addGradingJobs } = await import('./simple-grading.server');
    
    const gradingJobs = pendingResults.map(result => ({
      resultId: result.id,
      userId: userId,
      sessionId: sessionId
    }));

    const queueResult = await addGradingJobs(gradingJobs);
    
    if (!queueResult.success) {
      await db.gradingSession.update({
        where: { id: sessionId },
        data: { status: GradingSessionStatus.FAILED }
      });
      
      return { 
        success: false, 
        error: queueResult.error || 'Failed to start grading jobs' 
      };
    }

    logger.info(`🚀 Started grading session ${sessionId} with ${queueResult.addedCount} jobs`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to start grading session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start grading'
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
        userId
      },
      data: {
        status: GradingSessionStatus.CANCELLED
      }
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to cancel grading session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel grading session'
    };
  }
}