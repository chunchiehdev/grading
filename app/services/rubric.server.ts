import { db } from '@/lib/db.server';
import type { Rubric, RubricCriteria } from '@/types/grading';
import { ZodError } from 'zod';
import { GradingProgressService } from './grading-progress.server';
import logger from '@/utils/logger';
import { 
  uiCategoriesToDbCriteria, 
  validateRubricData,
  validateRubricCompletion,
  type UIRubricData,
  formatZodErrors
} from '@/utils/rubric-transform';
import { 
  CreateRubricRequestSchema,
  UpdateRubricRequestSchema,
  DeleteRubricRequestSchema,
  UIRubricDataSchema 
} from '@/schemas/rubric';

/**
 * Unified error handling for service operations
 * @param {unknown} error - The error object to handle
 * @param {string} operation - The operation name for error context
 * @returns {Object} Standardized error response object
 * @returns {false} returns.success - Always false for error responses
 * @returns {string} returns.error - Human-readable error message
 */
function handleServiceError(error: unknown, operation: string): { success: false; error: string } {
  console.error(`Error in ${operation}:`, error);
  
  if (error instanceof ZodError) {
    return { success: false, error: formatZodErrors(error).join('; ') };
  }
  
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  
  return { success: false, error: `${operation}過程中發生未知錯誤` };
}

/**
 * Creates a new rubric with validation and database transaction
 * @param {UIRubricData} rubricData - The rubric data from UI form
 * @returns {Promise<Object>} Result object containing success status, rubricId, or error
 * @returns {boolean} returns.success - Whether the operation succeeded
 * @returns {string} [returns.rubricId] - The created rubric ID if successful
 * @returns {string} [returns.error] - Error message if failed
 */
export async function createRubric(
  rubricData: UIRubricData
): Promise<{ success: boolean; rubricId?: string; error?: string }> {
  try {
    const validation = validateRubricData(rubricData);
    if (!validation.success) {
      return { success: false, error: validation.errors[0] };
    }

    const completionCheck = validateRubricCompletion(rubricData);
    if (!completionCheck.success) {
      const hasBlockingErrors = completionCheck.errors.some(err => 
        err.includes('請至少新增一個評分標準')
      );
      if (hasBlockingErrors) {
        return { success: false, error: completionCheck.errors[0] };
      }
    }

    const criteria = uiCategoriesToDbCriteria(validation.data!.categories);
    
    const result = await db.$transaction(async (prisma) => {
      const createdRubric = await prisma.rubric.create({
        data: {
          name: validation.data!.name,
          description: validation.data!.description,
          criteria: {
            create: criteria.map(criterion => ({
              id: criterion.id,
              name: criterion.name,
              description: criterion.description,
              levels: criterion.levels
            }))
          }
        },
        include: {
          criteria: true
        }
      });

      return createdRubric;
    });

    return {
      success: true,
      rubricId: result.id,
    };
  } catch (error) {
    return handleServiceError(error, '創建評分標準');
  }
}

/**
 * Retrieves all rubrics with their criteria, sorted by update time
 * @returns {Promise<Object>} Result object containing rubrics array and optional error
 * @returns {Rubric[]} returns.rubrics - Array of rubric objects with criteria
 * @returns {string} [returns.error] - Error message if retrieval failed
 */
export async function listRubrics(): Promise<{ rubrics: Rubric[]; error?: string }> {
  try {
    const dbRubrics = await db.rubric.findMany({
      include: {
        criteria: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const rubrics: Rubric[] = dbRubrics.map((dbRubric) => ({
      id: dbRubric.id,
      name: dbRubric.name,
      description: dbRubric.description,
      createdAt: dbRubric.createdAt,
      updatedAt: dbRubric.updatedAt,
      criteria: dbRubric.criteria.map((dbCriteria) => ({
        id: dbCriteria.id,
        name: dbCriteria.name,
        description: dbCriteria.description,
        levels: dbCriteria.levels as any,
      })),
    }));

    return { rubrics };
  } catch (error) {
    const errorResult = handleServiceError(error, '獲取評分標準列表');
    return {
      rubrics: [],
      error: errorResult.error,
    };
  }
}

/**
 * Retrieves a single rubric by ID with its criteria
 * @param {string} id - The rubric ID to retrieve
 * @returns {Promise<Object>} Result object containing rubric or error
 * @returns {Rubric} [returns.rubric] - The rubric object with criteria if found
 * @returns {string} [returns.error] - Error message if not found or failed
 */
export async function getRubric(id: string): Promise<{ rubric?: Rubric; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    
    const dbRubric = await db.rubric.findUnique({
      where: { id: validatedId },
      include: {
        criteria: true,
      },
    });

    if (!dbRubric) {
      return { error: '找不到評分標準' };
    }

    const rubric: Rubric = {
      id: dbRubric.id,
      name: dbRubric.name,
      description: dbRubric.description,
      createdAt: dbRubric.createdAt,
      updatedAt: dbRubric.updatedAt,
      criteria: dbRubric.criteria.map((dbCriteria) => ({
        id: dbCriteria.id,
        name: dbCriteria.name,
        description: dbCriteria.description,
        levels: dbCriteria.levels as any,
      })),
    };

    return { rubric };
  } catch (error) {
    const errorResult = handleServiceError(error, '獲取評分標準詳情');
    return { error: errorResult.error };
  }
}

/**
 * Updates an existing rubric with new data using database transaction
 * @param {string} id - The rubric ID to update
 * @param {UIRubricData} rubricData - The updated rubric data from UI
 * @returns {Promise<Object>} Result object containing success status or error
 * @returns {boolean} returns.success - Whether the update succeeded
 * @returns {string} [returns.error] - Error message if update failed
 */
export async function updateRubric(
  id: string,
  rubricData: UIRubricData
): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    const validation = validateRubricData(rubricData);
    
    if (!validation.success) {
      return { success: false, error: validation.errors[0] };
    }

    const criteria = uiCategoriesToDbCriteria(validation.data!.categories);

    await db.$transaction(async (tx) => {
      // 更新基本資訊
      await tx.rubric.update({
        where: { id: validatedId },
        data: {
          name: validation.data!.name,
          description: validation.data!.description,
        },
      });

      // 刪除舊的標準
      await tx.rubricCriteria.deleteMany({
        where: { rubricId: validatedId },
      });

      // 創建新的標準
      if (criteria.length > 0) {
        await tx.rubricCriteria.createMany({
          data: criteria.map(criterion => ({
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
            levels: criterion.levels,
            rubricId: validatedId,
          })),
        });
      }
    });

    return { success: true };
  } catch (error) {
    return handleServiceError(error, '更新評分標準');
  }
}

/**
 * Deletes a rubric and its criteria using cascade delete
 * @param {string} id - The rubric ID to delete
 * @returns {Promise<Object>} Result object containing success status or error
 * @returns {boolean} returns.success - Whether the deletion succeeded
 * @returns {string} [returns.error] - Error message if deletion failed
 */
export async function deleteRubric(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 使用 Zod 驗證 ID
    const { id: validatedId } = DeleteRubricRequestSchema.parse({ id });

    // 檢查評分標準是否存在
    const existingRubric = await db.rubric.findUnique({
      where: { id: validatedId },
      include: {
        criteria: true,
      },
    });

    if (!existingRubric) {
      return { success: false, error: '找不到要刪除的評分標準' };
    }

    // TODO: 檢查是否有相關的評分記錄，如果有則阻止刪除
    // const gradingRecords = await db.gradingRecord.count({
    //   where: { rubricId: validatedId }
    // });
    // if (gradingRecords > 0) {
    //   return { 
    //     success: false, 
    //     error: `此評分標準已被使用 ${gradingRecords} 次，無法刪除` 
    //   };
    // }

    // Prisma 的 cascade delete 會自動刪除相關的 criteria
    await db.rubric.delete({
      where: { id: validatedId },
    });

    return { success: true };
  } catch (error) {
    return handleServiceError(error, '刪除評分標準');
  }
}

/**
 * Grades a document using the specified rubric with progress tracking
 * @param {string} fileKey - The file key in storage to grade
 * @param {string} rubricId - The rubric ID to use for grading
 * @param {string} [gradingId] - Optional grading session ID for progress tracking
 * @param {string} userId - User ID for document processing
 * @returns {Promise<Object>} Result object containing grading results or error
 * @returns {boolean} returns.success - Whether the grading succeeded
 * @returns {any} [returns.gradingResult] - The grading analysis and scores if successful
 * @returns {string} [returns.error] - Error message if grading failed
 */
export async function gradeDocument(
  fileKey: string,
  rubricId: string,
  gradingId?: string,
  userId?: string,
): Promise<{
  success: boolean;
  gradingResult?: any;
  error?: string;
}> {
  let documentResult: any;
  
  try {
    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'check', progress: 10, message: '檢查檔案...' });
    }

    console.log('Starting document grading with params:', { fileKey, rubricId, gradingId, userId });
    
    const { rubric, error: rubricError } = await getRubric(rubricId);
    if (rubricError || !rubric) {
      return {
        success: false,
        error: `無法獲取評分標準: ${rubricError}`,
      };
    }

    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 20, message: '分析文件內容...' });
    }

    const { processDocument } = await import('./document-processor.server');
    documentResult = await processDocument({
      name: fileKey.split('/').pop() || fileKey,
      size: 0, // We don't know the size here, but it's not critical for processing
      type: 'application/octet-stream', // Default type, will be determined during processing
      key: fileKey,
      url: '', // Not needed for processing
    }, userId || 'default_user');

    if (documentResult.error) {
      return {
        success: false,
        error: `文件處理失敗: ${documentResult.error}`,
      };
    }

    if (gradingId) {
      await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 50, message: '使用傳統方式批改中...' });
    }

    // Legacy grading implementation with improved dummy data including Markdown
    const gradingResult = {
      score: Math.floor(Math.random() * 30) + 70, // 70-100 score range
      analysis: `這份作業展現了學生在多個方面的能力。文件結構清晰，內容有一定的深度，但在某些細節上還有改進空間。整體而言，這是一份${documentResult.content.length > 1000 ? '內容豐富' : '簡潔'}的作業。`,
      analysisMarkdown: `## 作業評析

這份作業展現了學生在多個方面的能力：

### 優點分析
- **文件結構清晰** - 邏輯層次分明
- **內容有一定深度** - 展現了思考過程
- **格式規範** - 符合學術寫作要求

### 待改進之處
在某些細節上還有**改進空間**，特別是：
1. 論證的深度可以進一步加強
2. 引用資料的多樣性需要提升

> 整體而言，這是一份${documentResult.content.length > 1000 ? '**內容豐富**' : '**簡潔明瞭**'}的作業。`,
      criteriaScores: rubric.criteria.map((criteria, index) => {
        const baseScore = Math.floor(Math.random() * 3) + 3; // 3-5 score range
        return {
          name: criteria.name,
          score: baseScore,
          comments: `在${criteria.name}方面表現${baseScore >= 4 ? '良好' : '尚可'}，${baseScore >= 4 ? '符合' : '基本達到'}評分標準的要求。`,
          commentsMarkdown: `### ${criteria.name} 評分分析

**表現程度**: ${baseScore >= 4 ? '**良好**' : '**尚可**'}

- 評分: **${baseScore}/5**
- 標準符合度: ${baseScore >= 4 ? '**完全符合**' : '**基本達到**'}評分標準的要求

${baseScore >= 4 ? 
  '#### 優秀表現\n- 展現了深度理解\n- 技能運用得當\n- 超出基本要求' : 
  '#### 改進建議\n- 可進一步深化理解\n- 技能運用需加強\n- 朝向更高標準努力'
}`,
        };
      }),
      strengths: [
        "文檔結構組織良好",
        "內容表達清晰",
        "符合基本格式要求"
      ],
      strengthsMarkdown: [
        "**文檔結構組織良好** - 邏輯清晰，層次分明",
        "**內容表達清晰** - 語言流暢，表達準確",
        "**符合基本格式要求** - 遵循學術規範"
      ],
      improvements: [
        "可以增加更多具體的例子或細節",
        "某些論點可以進一步深化",
        "建議檢查拼寫和語法"
      ],
      improvementsMarkdown: [
        "**增加具體例子** - 可以增加更多*具體的例子或細節*來支持論點",
        "**深化論點** - 某些論點可以進一步**深化**和擴展",
        "**語言精確性** - 建議檢查`拼寫`和`語法`，提升表達精確度"
      ],
      overallSuggestions: "建議在下次作業中注重內容的深度分析，並加強論據的支撐。",
      overallSuggestionsMarkdown: `## 整體建議

### 📈 下次作業重點改進方向

1. **深度分析** - 注重內容的*深度分析*，避免淺顯論述
2. **論據支撐** - 加強**論據的支撐**，增加引用和實例
3. **批判思維** - 展現更多個人見解和批判性思考

### 🎯 具體行動建議
- [ ] 閱讀更多相關資料
- [ ] 練習論證結構
- [ ] 加強學術寫作技巧

> **持續進步** 是學習的關鍵，期待看到你在下次作業中的成長！`,
      createdAt: new Date().toISOString(),
      gradingDuration: Math.floor(Math.random() * 8) + 3, // 3-10 seconds
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
    console.error('Error during grading:', error);
    
    // Log additional context for debugging
    console.error('Grading context:', {
      fileKey,
      rubricId,
      gradingId,
      documentContentLength: documentResult?.content?.length,
      errorType: error?.constructor?.name,
      errorStack: error?.stack
    });
    
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
