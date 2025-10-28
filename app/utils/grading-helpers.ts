import { ZodError } from 'zod';
import {
  GradingResultDataSchema,
  GradingResultWithContextSchema,
  UsedContextSchema,
  type GradingResultData,
  type GradingResultWithContext,
  type UsedContext,
} from '@/schemas/grading';

export type { GradingResultData, GradingResultWithContext, UsedContext };

/**
 * Safely parses and validates grading result data from database JsonValue field
 * @param {unknown} value - Unknown value from database (likely JsonValue)
 * @returns {GradingResultData | null} Validated GradingResultData or null if validation fails
 */
export function parseGradingResult(value: unknown): GradingResultData | null {
  try {
    return GradingResultDataSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('Invalid grading result data:', error.errors);
    }
    return null;
  }
}

/**
 * Safely parses and validates grading result with context
 * @param {unknown} value - Unknown value from database (likely JsonValue)
 * @returns {GradingResultWithContext | null} Validated data or null if validation fails
 */
export function parseGradingResultWithContext(value: unknown): GradingResultWithContext | null {
  try {
    return GradingResultWithContextSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('Invalid grading result with context data:', error.errors);
    }
    return null;
  }
}

/**
 * Safely parses and validates used context data
 * @param {unknown} value - Unknown value from database (likely JsonValue)
 * @returns {UsedContext | null} Validated UsedContext or null if validation fails
 */
export function parseUsedContext(value: unknown): UsedContext | null {
  try {
    return UsedContextSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('Invalid used context data:', error.errors);
    }
    return null;
  }
}

/**
 * Extracts total score from grading result safely
 * Handles null/undefined gracefully without throwing
 * @param {unknown} result - Grading result object (JsonValue)
 * @returns {number | undefined} Total score or undefined if not found or invalid
 */
export function extractTotalScore(result: unknown): number | undefined {
  const parsed = parseGradingResult(result);
  return parsed?.totalScore;
}

/**
 * Extracts max score from grading result safely
 * @param {unknown} result - Grading result object (JsonValue)
 * @returns {number | undefined} Max score or undefined if not found or invalid
 */
export function extractMaxScore(result: unknown): number | undefined {
  const parsed = parseGradingResult(result);
  return parsed?.maxScore;
}

/**
 * Extracts breakdown array from grading result safely
 * @param {unknown} result - Grading result object (JsonValue)
 * @returns {Array} Breakdown array or empty array if not found or invalid
 */
export function extractBreakdown(result: unknown) {
  const parsed = parseGradingResult(result);
  return parsed?.breakdown ?? [];
}

/**
 * Extracts overall feedback from grading result safely
 * @param {unknown} result - Grading result object (JsonValue)
 * @returns {string | undefined} Overall feedback or undefined if not found or invalid
 */
export function extractOverallFeedback(result: unknown): string | undefined {
  const parsed = parseGradingResult(result);
  if (!parsed?.overallFeedback) return undefined;

  // If it's a structured object, convert to string
  if (typeof parsed.overallFeedback === 'object' && parsed.overallFeedback !== null) {
    const feedback = parsed.overallFeedback as Record<string, unknown>;
    const summary = feedback.summary;
    return typeof summary === 'string' ? summary : 'No feedback provided';
  }

  return typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback : undefined;
}

/**
 * Type guard to check if a value is a valid GradingResultData
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is valid GradingResultData
 */
export function isGradingResultData(value: unknown): value is GradingResultData {
  try {
    GradingResultDataSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a valid GradingResultWithContext
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is valid GradingResultWithContext
 */
export function isGradingResultWithContext(value: unknown): value is GradingResultWithContext {
  try {
    GradingResultWithContextSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is valid UsedContext
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is valid UsedContext
 */
export function isUsedContext(value: unknown): value is UsedContext {
  try {
    UsedContextSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely extracts typed grading result with fallback
 * Use when you need the full validated object
 * @param {unknown} result - Grading result from database
 * @returns {GradingResultData} Validated data or default empty structure
 */
export function getGradingResultWithDefault(result: unknown): GradingResultData {
  const parsed = parseGradingResult(result);
  if (parsed) return parsed;

  // Return safe default
  return {
    totalScore: 0,
    maxScore: 100,
    breakdown: [],
    overallFeedback: 'No grading result available',
  };
}
