import { ZodError } from 'zod';
import { GradingResultDataSchema, GradingResultData, UsedContext } from '@/schemas/grading';

export type { GradingResultData, UsedContext };

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
