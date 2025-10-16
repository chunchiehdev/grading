import { ZodError } from 'zod';
import {
  type RubricCriteria,
  type UIRubricData,
  type UICategory,
  type UICriterion,
  type UILevel,
} from '@/types/rubric';
import { UIRubricDataSchema, RubricCompletionSchema, type Level } from '@/schemas/rubric';

export type { Level, UICriterion, UICategory, UIRubricData };

/**
 * Converts database criteria to UI categories structure
 * @param {any[]} categories - Array of categories from database
 * @returns {UICategory[]} Array of UI category objects
 */
export function dbCriteriaToUICategories(categories: any[]): UICategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    criteria: category.criteria.map((criterion: any) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description || '',
      levels: criterion.levels as UILevel[],
    })),
  }));
}

/**
 * Converts UI categories to database criteria structure (for new JSON schema)
 * @param {UICategory[]} categories - Array of UI category objects
 * @returns {RubricCriteria[]} Array of criteria for database storage as JSON
 */
export function uiCategoriesToDbCriteria(categories: UICategory[]): RubricCriteria[] {
  return categories.flatMap((category) =>
    category.criteria.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description || '',
      maxScore: Math.max(...criterion.levels.map((l) => l.score)),
      levels: criterion.levels,
    }))
  );
}

/**
 * Validates rubric data using Zod schema validation
 * @param {UIRubricData} data - Rubric data to validate
 * @returns {Object} Validation result with success status, errors, and validated data
 * @returns {boolean} returns.success - Whether validation passed
 * @returns {string[]} returns.errors - Array of validation error messages
 * @returns {UIRubricData} [returns.data] - Validated data if successful
 */
export function validateRubricData(data: UIRubricData): {
  success: boolean;
  errors: string[];
  data?: UIRubricData;
} {
  try {
    const validatedData = UIRubricDataSchema.parse(data);
    return { success: true, errors: [], data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['驗證過程中發生未知錯誤'] };
  }
}

/**
 * Validates rubric completion - checks if rubric is ready for saving
 * @param {UIRubricData} data - Rubric data to check for completeness
 * @returns {Object} Completion validation result
 * @returns {boolean} returns.success - Whether rubric is complete enough to save
 * @returns {string[]} returns.errors - Array of critical error messages
 * @returns {string[]} returns.warnings - Array of non-critical warning messages
 */
export function validateRubricCompletion(data: UIRubricData): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  const warnings: string[] = [];

  try {
    RubricCompletionSchema.parse(data);

    // 檢查可選的警告
    const totalCriteria = data.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
    const completedCriteria = data.categories.reduce(
      (acc, cat) =>
        acc + cat.criteria.filter((crit) => crit.levels.some((level) => level.description.trim().length > 0)).length,
      0
    );

    if (completedCriteria < totalCriteria) {
      warnings.push(`還有 ${totalCriteria - completedCriteria} 個評分標準未完成等級描述`);
    }

    // 檢查是否所有等級都有描述
    data.categories.forEach((category) => {
      category.criteria.forEach((criterion) => {
        const incompletelevels = criterion.levels.filter((level) => !level.description.trim());
        if (incompletelevels.length > 0) {
          warnings.push(`「${criterion.name}」缺少 ${incompletelevels.length} 個等級描述`);
        }
      });
    });

    return { success: true, errors: [], warnings };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => err.message);
      return { success: false, errors, warnings };
    }
    return { success: false, errors: ['驗證過程中發生未知錯誤'], warnings };
  }
}

/**
 * Calculates rubric statistics for progress tracking
 * @param {UICategory[]} categories - Array of UI category objects
 * @returns {Object} Statistics object with completion metrics
 * @returns {number} returns.totalCategories - Total number of categories
 * @returns {number} returns.totalCriteria - Total number of criteria
 * @returns {number} returns.completedCriteria - Number of criteria with descriptions
 * @returns {number} returns.maxScore - Maximum possible score (totalCriteria * 4)
 * @returns {number} returns.completionRate - Completion percentage (0-100)
 */
export function calculateRubricStats(categories: UICategory[]): {
  totalCategories: number;
  totalCriteria: number;
  completedCriteria: number;
  maxScore: number;
  completionRate: number;
} {
  const totalCategories = categories.length;
  const totalCriteria = categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
  const completedCriteria = categories.reduce(
    (acc, cat) =>
      acc + cat.criteria.filter((crit) => crit.levels.some((level) => level.description.trim().length > 0)).length,
    0
  );
  const maxScore = totalCriteria * 4;
  const completionRate = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  return {
    totalCategories,
    totalCriteria,
    completedCriteria,
    maxScore,
    completionRate,
  };
}

/**
 * Safely parses JSON string to categories array with validation
 * @param {string} jsonString - JSON string representing categories data
 * @returns {Object} Parse result with success status and data or error
 * @returns {boolean} returns.success - Whether parsing was successful
 * @returns {UICategory[]} [returns.data] - Parsed categories array if successful
 * @returns {string} [returns.error] - Error message if parsing failed
 */
export function safeParseCategoriesJson(jsonString: string): {
  success: boolean;
  data?: UICategory[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const categories = Array.isArray(parsed) ? parsed : [];

    // 基本驗證每個 category 的結構
    for (const category of categories) {
      if (!category.id || !category.name || !Array.isArray(category.criteria)) {
        return { success: false, error: '無效的類別資料結構' };
      }
    }

    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: 'JSON 格式錯誤' };
  }
}

/**
 * Converts Zod error object to human-readable error messages
 * @param {ZodError} errors - Zod validation error object
 * @returns {string[]} Array of formatted error messages in Chinese
 */
export function formatZodErrors(errors: ZodError): string[] {
  return errors.errors.map((err) => err.message);
}
