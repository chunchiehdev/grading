import { z } from 'zod';
import type { UICategory, UICriterion, UILevel } from '@/types/rubric';

/**
 * Zod schemas for database rubric data (criteria JSON field)
 * These schemas validate the structure stored in the database JSON field
 */

// Level in database format
export const DbLevelSchema = z.object({
  score: z.number().int(),
  description: z.string(),
});

// Criterion in database format
export const DbCriterionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  maxScore: z.number(),
  levels: z.array(DbLevelSchema),
});

// Category in database format (groups criteria)
export const DbCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  criteria: z.array(DbCriterionSchema),
});

// Full criteria array as stored in database
export const DbRubricCriteriaSchema = z.array(DbCategorySchema);

// Export types inferred from schemas
export type DbLevel = z.infer<typeof DbLevelSchema>;
export type DbCriterion = z.infer<typeof DbCriterionSchema>;
export type DbCategory = z.infer<typeof DbCategorySchema>;
export type DbRubricCriteria = z.infer<typeof DbRubricCriteriaSchema>;

/**
 * Parse and validate criteria from database
 * @param {unknown} criteria - The criteria value from database JSON field
 * @returns {DbRubricCriteria | null} Validated criteria or null if invalid
 */
export function parseRubricCriteria(criteria: unknown): DbRubricCriteria | null {
  try {
    return DbRubricCriteriaSchema.parse(criteria);
  } catch (error) {
    console.warn('Invalid rubric criteria data:', error);
    return null;
  }
}

/**
 * Validate criteria safely and return with fallback
 * @param {unknown} criteria - The criteria value from database JSON field
 * @returns {DbRubricCriteria} Validated criteria or empty array
 */
export function parseRubricCriteriaWithDefault(criteria: unknown): DbRubricCriteria {
  return parseRubricCriteria(criteria) ?? [];
}

/**
 * Type guard to check if a value is a valid DbRubricCriteria
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is valid DbRubricCriteria
 */
export function isDbRubricCriteria(value: unknown): value is DbRubricCriteria {
  try {
    DbRubricCriteriaSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a valid DbCategory
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is valid DbCategory
 */
export function isDbCategory(value: unknown): value is DbCategory {
  try {
    DbCategorySchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Flatten categories to get all criteria (used for RubricResponse.criteria)
 * @param {DbRubricCriteria} categories - Array of categories
 * @returns {DbCriterion[]} Flattened array of all criteria
 */
export function flattenCategoriesToCriteria(categories: DbRubricCriteria): DbCriterion[] {
  return categories.flatMap((cat) => cat.criteria);
}

/**
 * Transform UI categories to database format for storage
 * @param {UICategory[]} categories - UI categories from form
 * @returns {DbRubricCriteria} Database format criteria
 */
export function transformUICategoriesToDbCriteria(categories: UICategory[]): DbRubricCriteria {
  const transformed = categories.map((category) => ({
    id: category.id,
    name: category.name,
    criteria: category.criteria.map((criterion: UICriterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description || '',
      maxScore: Math.max(...criterion.levels.map((l: UILevel) => l.score)),
      levels: criterion.levels.map((level: UILevel) => ({
        score: level.score,
        description: level.description,
      })),
    })),
  })) as DbRubricCriteria;

  return transformed;
}
