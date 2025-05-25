import { db } from '@/lib/db.server';
import type { Rubric, RubricCriteria } from '@/types/grading';
import { ZodError } from 'zod';
import { GradingProgressService } from './grading-progress.server';
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
    // 使用 Zod 驗證資料
    const validation = validateRubricData(rubricData);
    if (!validation.success) {
      return { success: false, error: validation.errors[0] };
    }

    // 檢查完整性（可選驗證，只顯示警告）
    const completionCheck = validateRubricCompletion(rubricData);
    if (!completionCheck.success) {
      // 如果有嚴重錯誤才阻止儲存
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
    // 驗證 ID 格式
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
    // 驗證 ID 和資料
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
 * @returns {Promise<Object>} Result object containing grading results or error
 * @returns {boolean} returns.success - Whether the grading succeeded
 * @returns {any} [returns.gradingResult] - The grading analysis and scores if successful
 * @returns {string} [returns.error] - Error message if grading failed
 */
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

    console.log('Starting document grading with params:', { fileKey, rubricId, gradingId });
    
    // 驗證並獲取 Rubric
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

    // 取得文件內容
    const { processDocument } = await import('./document-processor.server');
    const documentResult = await processDocument({
      name: fileKey.split('/').pop() || fileKey,
      size: 0, // We don't know the size here, but it's not critical for processing
      type: 'application/octet-stream', // Default type, will be determined during processing
      key: fileKey,
      url: '', // Not needed for processing
    });

    if (documentResult.error) {
      return {
        success: false,
        error: `文件處理失敗: ${documentResult.error}`,
      };
    }

    // Check if using MCP or legacy processing
    const useMCP = process.env.USE_MCP === 'true';
    
    if (useMCP) {
      // Use MCP for grading
      const { createMCPGradingClient, convertMCPResponseToLegacyFormat } = await import('./mcp.server');
      const mcpClient = createMCPGradingClient();
      
      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 30, message: '使用 MCP 進行 AI 評分...' });
      }

      const mcpResponse = await mcpClient.gradeDocument(documentResult, rubric, gradingId);
      
      if (!mcpResponse.success) {
        return {
          success: false,
          error: mcpResponse.error || 'MCP 評分失敗',
        };
      }

      // Convert MCP response to legacy format for compatibility
      const gradingResult = convertMCPResponseToLegacyFormat(mcpResponse);
      
      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, { phase: 'completed', progress: 100, message: '評分完成' });
      }

      return {
        success: true,
        gradingResult,
      };
    } else {
      // Legacy grading logic (示例實現)
      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 50, message: '使用傳統方式批改中...' });
      }

      // 這裡應該實現實際的評分邏輯
      // 目前返回示例結果
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
    }
  } catch (error: any) {
    console.error('Error during grading:', error);
    
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
