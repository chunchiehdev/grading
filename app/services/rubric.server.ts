import { db } from '@/lib/db.server';
import { PrismaClient } from '@/types/database';
import { ZodError } from 'zod';
import { GradingProgressService } from './grading-progress.server';
import logger from '@/utils/logger';
import { 
  uiCategoriesToDbCriteria, 
  validateRubricData,
  validateRubricCompletion,
  formatZodErrors
} from '@/utils/rubric-transform';
import { 
  CreateRubricRequestSchema,
  UpdateRubricRequestSchema,
  DeleteRubricRequestSchema,
  UIRubricDataSchema 
} from '@/schemas/rubric';
import { 
  type RubricCriteria,
  type RubricResponse,
  type UIRubricData 
} from '@/types/rubric';

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
 * 將UI類別轉換為新schema的criteria JSON格式
 */
function transformUICategoriesToCriteria(categories: any[]): RubricCriteria[] {
  const criteria: RubricCriteria[] = [];
  
  categories.forEach(category => {
    category.criteria.forEach((criterion: any) => {
      criteria.push({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description || '',
        maxScore: Math.max(...criterion.levels.map((l: any) => l.score)),
        levels: criterion.levels.map((level: any) => ({
          score: level.score,
          description: level.description
        }))
      });
    });
  });
  
  return criteria;
}

/**
 * 將資料庫 criteria JSON 轉換為 RubricCriteria[]
 */
function parseCriteriaFromDB(criteria: unknown): RubricCriteria[] {
  if (Array.isArray(criteria)) {
    return criteria as RubricCriteria[];
  }
  return [];
}

/**
 * Creates a new rubric with validation and version control
 * @param {UIRubricData} rubricData - The rubric data from UI form
 * @param {string} [userId] - Optional user ID for version control
 * @returns {Promise<Object>} Result object containing success status, rubricId, or error
 * @returns {boolean} returns.success - Whether the operation succeeded
 * @returns {string} [returns.rubricId] - The created rubric ID if successful
 * @returns {string} [returns.error] - Error message if failed
 */
export async function createRubric(
  rubricData: UIRubricData,
  userId?: string
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

    const criteria = transformUICategoriesToCriteria(validation.data!.categories);
    
    const result = await db.rubric.create({
      data: {
        userId: userId || 'default-user', // TODO: 從認證中取得真實userId
        name: validation.data!.name,
        description: validation.data!.description,
        version: 1,
        isActive: true,
        criteria: criteria as any // Prisma JsonValue
      }
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
 * Retrieves all active rubrics, sorted by update time
 * @param {string} [userId] - Optional user ID to filter rubrics
 * @returns {Promise<Object>} Result object containing rubrics array and optional error
 * @returns {RubricResponse[]} returns.rubrics - Array of rubric objects with criteria
 * @returns {string} [returns.error] - Error message if retrieval failed
 */
export async function listRubrics(userId?: string): Promise<{ rubrics: RubricResponse[]; error?: string }> {
  try {
    const dbRubrics = await db.rubric.findMany({
      where: {
        isActive: true,
        ...(userId && { userId })
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const rubrics: RubricResponse[] = dbRubrics.map((dbRubric) => ({
      id: dbRubric.id,
      name: dbRubric.name,
      description: dbRubric.description,
      version: dbRubric.version,
      isActive: dbRubric.isActive,
      createdAt: dbRubric.createdAt,
      updatedAt: dbRubric.updatedAt,
      criteria: parseCriteriaFromDB(dbRubric.criteria),
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
 * Retrieves a single rubric by ID
 * @param {string} id - The rubric ID to retrieve
 * @returns {Promise<Object>} Result object containing rubric or error
 * @returns {RubricResponse} [returns.rubric] - The rubric object with criteria if found
 * @returns {string} [returns.error] - Error message if not found or failed
 */
export async function getRubric(id: string): Promise<{ rubric?: RubricResponse; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    
    const dbRubric = await db.rubric.findUnique({
      where: { 
        id: validatedId,
        isActive: true 
      }
    });

    if (!dbRubric) {
      return { error: '找不到評分標準' };
    }

    const rubric: RubricResponse = {
      id: dbRubric.id,
      name: dbRubric.name,
      description: dbRubric.description,
      version: dbRubric.version,
      isActive: dbRubric.isActive,
      createdAt: dbRubric.createdAt,
      updatedAt: dbRubric.updatedAt,
      criteria: parseCriteriaFromDB(dbRubric.criteria),
    };

    return { rubric };
  } catch (error) {
    const errorResult = handleServiceError(error, '獲取評分標準詳情');
    return { error: errorResult.error };
  }
}

/**
 * Updates an existing rubric with version control
 * @param {string} id - The rubric ID to update
 * @param {UIRubricData} rubricData - The updated rubric data from UI
 * @param {string} [userId] - Optional user ID for version control
 * @returns {Promise<Object>} Result object containing success status or error
 * @returns {boolean} returns.success - Whether the update succeeded
 * @returns {string} [returns.error] - Error message if update failed
 */
export async function updateRubric(
  id: string,
  rubricData: UIRubricData,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    const validation = validateRubricData(rubricData);
    
    if (!validation.success) {
      return { success: false, error: validation.errors[0] };
    }

    // 檢查評分標準是否存在
    const existingRubric = await db.rubric.findUnique({
      where: { id: validatedId, isActive: true }
    });

    if (!existingRubric) {
      return { success: false, error: '找不到評分標準' };
    }

    const criteria = transformUICategoriesToCriteria(validation.data!.categories);
    
    // 使用事務處理版本控制
    await db.$transaction(async (prisma) => {
      // 將舊版本設為非活躍
      await prisma.rubric.update({
        where: { id: validatedId },
        data: { isActive: false }
      });

      // 創建新版本
      await prisma.rubric.create({
        data: {
          userId: existingRubric.userId,
          name: validation.data!.name,
          description: validation.data!.description,
          version: existingRubric.version + 1,
          isActive: true,
          criteria: criteria as any // Prisma JsonValue
        }
      });
    });

    return { success: true };
  } catch (error) {
    return handleServiceError(error, '更新評分標準');
  }
}

/**
 * Soft deletes a rubric by setting isActive to false
 * @param {string} id - The rubric ID to delete
 * @returns {Promise<Object>} Result object containing success status or error
 * @returns {boolean} returns.success - Whether the deletion succeeded
 * @returns {string} [returns.error] - Error message if deletion failed
 */
export async function deleteRubric(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    
    // 檢查是否有關聯的評分結果
    const relatedResults = await db.gradingResult.findFirst({
      where: { rubricId: validatedId }
    });

    if (relatedResults) {
      return { 
        success: false, 
        error: '此評分標準已被使用，無法刪除。您可以建立新版本來替代。' 
      };
    }

    await db.rubric.update({
      where: { id: validatedId },
      data: { isActive: false }
    });

    return { success: true };
  } catch (error) {
    return handleServiceError(error, '刪除評分標準');
  }
}

/**
 * Gets all versions of a rubric
 * @param {string} id - The rubric ID to retrieve versions for
 * @returns {Promise<Object>} Result object containing versions array and optional error
 * @returns {RubricResponse[]} returns.versions - Array of rubric versions
 * @returns {string} [returns.error] - Error message if retrieval failed
 */
export async function getRubricVersions(id: string): Promise<{ versions: RubricResponse[]; error?: string }> {
  try {
    const validatedId = DeleteRubricRequestSchema.shape.id.parse(id);
    
    // 先找到該評分標準的userId
    const rubric = await db.rubric.findUnique({
      where: { id: validatedId }
    });

    if (!rubric) {
      return { versions: [], error: '找不到評分標準' };
    }

    // 找到同名的所有版本
    const versions = await db.rubric.findMany({
      where: {
        userId: rubric.userId,
        name: rubric.name
      },
      orderBy: {
        version: 'desc'
      }
    });

    const versionResponses: RubricResponse[] = versions.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      version: v.version,
      isActive: v.isActive,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      criteria: parseCriteriaFromDB(v.criteria),
    }));

    return { versions: versionResponses };
  } catch (error) {
    const errorResult = handleServiceError(error, '獲取評分標準版本歷史');
    return {
      versions: [],
      error: errorResult.error,
    };
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
  // TODO: 這個函數需要重新實作以配合新的GradingSession/GradingResult架構
  return {
    success: false,
    error: '評分功能正在重構中，請稍後再試'
  };
}
