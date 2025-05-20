import { db } from '@/lib/db.server';
import type { Rubric, RubricCriteria } from '@/types/grading';
import logger from '@/utils/logger';
import { GradingProgressService } from './grading-progress.server';

export async function createRubric(
  rubric: Omit<Rubric, 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; rubricId?: string; error?: string }> {
  try {
    logger.info({ rubric }, 'Creating new rubric');

    const result = await db.$transaction(async (prisma) => {
      const createdRubric = await prisma.rubric.create({
        data: {
          id: rubric.id,
          name: rubric.name,
          description: rubric.description,
          criteria: {
            create: rubric.criteria.map(criteria => ({
              id: criteria.id,
              name: criteria.name,
              description: criteria.description,
              levels: criteria.levels as any
            }))
          }
        },
        include: {
          criteria: true
        }
      });

      return createdRubric;
    });

    logger.info({ rubricId: result.id }, 'Rubric created successfully');

    return {
      success: true,
      rubricId: result.id,
    };
  } catch (error: any) {
    logger.error({ error }, 'Error creating rubric');
    return {
      success: false,
      error: error.message || '無法創建評分標準',
    };
  }
}

export async function listRubrics(): Promise<{ rubrics: Rubric[]; error?: string }> {
  try {
    logger.info('Listing all rubrics');

    const dbRubrics = await db.rubric.findMany({
      include: {
        criteria: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const rubrics: Rubric[] = dbRubrics.map((dbRubric: any) => {
      const criteria: RubricCriteria[] = dbRubric.criteria.map((dbCriteria: any) => ({
        id: dbCriteria.id,
        name: dbCriteria.name,
        description: dbCriteria.description,
        levels: dbCriteria.levels as any, 
      }));

      return {
        id: dbRubric.id,
        name: dbRubric.name,
        description: dbRubric.description,
        createdAt: dbRubric.createdAt,
        updatedAt: dbRubric.updatedAt,
        criteria,
      };
    });

    return { rubrics };
  } catch (error: any) {
    logger.error({ error }, 'Error listing rubrics');
    return {
      rubrics: [],
      error: error.message || '無法獲取評分標準列表',
    };
  }
}

export async function getRubric(id: string): Promise<{ rubric?: Rubric; error?: string }> {
  try {
    logger.info({ rubricId: id }, 'Getting rubric');

    const dbRubric = await db.rubric.findUnique({
      where: { id },
      include: {
        criteria: true,
      },
    });

    if (!dbRubric) {
      return { error: '找不到評分標準' };
    }

    const criteria: RubricCriteria[] = dbRubric.criteria.map((dbCriteria: any) => ({
      id: dbCriteria.id,
      name: dbCriteria.name,
      description: dbCriteria.description,
      levels: dbCriteria.levels as any, 
    }));

    const rubric: Rubric = {
      id: dbRubric.id,
      name: dbRubric.name,
      description: dbRubric.description,
      createdAt: dbRubric.createdAt,
      updatedAt: dbRubric.updatedAt,
      criteria,
    };

    return { rubric };
  } catch (error: any) {
    logger.error({ rubricId: id, error }, 'Error getting rubric');
    return {
      error: error.message || '無法獲取評分標準詳情',
    };
  }
}

export async function updateRubric(
  id: string,
  rubric: Omit<Rubric, 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info({ rubricId: id, rubric }, 'Updating rubric');

    await db.$transaction(async (tx) => {
      await tx.rubric.update({
        where: { id },
        data: {
          name: rubric.name,
          description: rubric.description,
        },
      });

      await tx.rubricCriteria.deleteMany({
        where: { rubricId: id },
      });

      for (const criteria of rubric.criteria) {
        await tx.rubricCriteria.create({
          data: {
            id: criteria.id,
            name: criteria.name,
            description: criteria.description,
            levels: criteria.levels, 
            rubricId: id,
          },
        });
      }
    });

    logger.info({ rubricId: id }, 'Rubric updated successfully');

    return { success: true };
  } catch (error: any) {
    logger.error({ rubricId: id, error }, 'Error updating rubric');
    return {
      success: false,
      error: error.message || '無法更新評分標準',
    };
  }
}

export async function deleteRubric(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info({ rubricId: id }, 'Deleting rubric');

    await db.rubric.delete({
      where: { id },
    });

    logger.info({ rubricId: id }, 'Rubric deleted successfully');

    return { success: true };
  } catch (error: any) {
    logger.error({ rubricId: id, error }, 'Error deleting rubric');
    return {
      success: false,
      error: error.message || '無法刪除評分標準',
    };
  }
}

export async function gradeDocument(
  fileKey: string,
  rubricId: string,
  gradingId?: string,
): Promise<{
  success: boolean;
  gradingResult?: any;
  error?: string;
}> {
  try {
    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'check', progress: 10, message: '檢查檔案...' });
    }

    logger.info({ fileKey, rubricId, gradingId }, 'Starting document grading');
    
    // 1. 獲取 Rubric
    const { rubric, error: rubricError } = await getRubric(rubricId);
    if (rubricError || !rubric) {
      logger.error({ gradingId, error: rubricError }, 'Failed to fetch rubric');
      return {
        success: false,
        error: `無法獲取評分標準: ${rubricError}`,
      };
    }

    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 50, message: '批改中...' });
    }

    // 這裡應該實現實際的評分邏輯
    // 由於我們不再呼叫外部 API，需要決定如何實現評分功能
  
    const gradingResult = {
      score: 85,
      analysis: "這是一個示例分析",
      criteriaScores: rubric.criteria.map(criteria => ({
        name: criteria.name,
        score: Math.floor(Math.random() * 5) + 1, // 1-5 分
        comments: `關於 ${criteria.name} 的評語`,
      })),
      strengths: ["優點 1", "優點 2"],
      improvements: ["改進點 1", "改進點 2"],
      createdAt: new Date().toISOString(),
      gradingDuration: 5, // 秒
    };

    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'verify', progress: 90, message: '驗證評分結果...' });
    }

    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'completed', progress: 100, message: '評分完成' });
    }

    return {
      success: true,
      gradingResult,
    };
  } catch (error: any) {
    logger.error({ gradingId, error: error.message }, 'Error during grading');
    
    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { 
        phase: 'error', 
        progress: 0, 
        message: '評分過程中發生錯誤' 
      });
    }

    return {
      success: false,
      error: error.message || '評分過程中發生錯誤',
    };
  }
}
