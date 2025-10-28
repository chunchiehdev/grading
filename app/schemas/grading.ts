import { z } from 'zod';

/**
 * Zod schemas for grading result validation
 * Ensures type safety when accessing JsonValue fields from database
 */

// Overall feedback can be a string or structured object
export const OverallFeedbackSchema = z.union([
  z.string(),
  z.object({
    documentStrengths: z.array(z.string()).optional(),
    keyImprovements: z.array(z.string()).optional(),
    nextSteps: z.string().optional(),
    summary: z.string().optional(),
  }),
]);

// Individual criterion breakdown item
export const CriteriaBreakdownSchema = z.object({
  criteriaId: z.string(),
  name: z.string(),
  score: z.number(),
  feedback: z.string(),
});

// Main grading result data structure
export const GradingResultDataSchema = z.object({
  totalScore: z.number(),
  maxScore: z.number(),
  breakdown: z.array(CriteriaBreakdownSchema),
  overallFeedback: OverallFeedbackSchema,
});

// Context about what was used during grading (Feature 004)
export const UsedContextSchema = z.object({
  assignmentAreaId: z.string().nullable().optional(),
  referenceFilesUsed: z.array(
    z.object({
      fileId: z.string(),
      fileName: z.string(),
      contentLength: z.number(),
      wasTruncated: z.boolean(),
    })
  ).optional(),
  customInstructionsUsed: z.boolean().optional(),
});

// Extended grading result with context
export const GradingResultWithContextSchema = GradingResultDataSchema.extend({
  usedContext: UsedContextSchema.optional(),
  gradingModel: z.string().optional(),
  gradingDuration: z.number().optional(),
});

// Export types inferred from schemas
export type OverallFeedback = z.infer<typeof OverallFeedbackSchema>;
export type CriteriaBreakdown = z.infer<typeof CriteriaBreakdownSchema>;
export type GradingResultData = z.infer<typeof GradingResultDataSchema>;
export type UsedContext = z.infer<typeof UsedContextSchema>;
export type GradingResultWithContext = z.infer<typeof GradingResultWithContextSchema>;
