/**
 * Zod Schemas for Agent-based Grading
 *
 * Validation schemas for Agent tool inputs/outputs and grading results
 */

import { z } from 'zod';

/**
 * Rubric analysis tool schema
 */
export const RubricAnalysisSchema = z.object({
  complexity: z.enum(['simple', 'medium', 'complex']),
  totalMaxScore: z.number().int().positive(),
  keyDimensions: z.array(z.string()),
  recommendedApproach: z.string(),
  criteriaCount: z.number().int().positive(),
});

/**
 * Content parsing tool schema
 */
export const ContentAnalysisSchema = z.object({
  wordCount: z.number().int().nonnegative(),
  characterCount: z.number().int().nonnegative(),
  hasCode: z.boolean(),
  hasImages: z.boolean(),
  hasTables: z.boolean(),
  structure: z.object({
    sections: z.number().int().nonnegative(),
    headings: z.array(z.string()),
    keyPoints: z.array(z.string()),
  }),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
});

/**
 * Confidence scoring tool schema
 */
export const ConfidenceScoreSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  shouldReview: z.boolean(),
  reason: z.string(),
  factors: z.object({
    rubricCoverage: z.number().min(0).max(1),
    evidenceQuality: z.enum(['high', 'medium', 'low']),
    criteriaAmbiguity: z.number().min(0).max(1),
  }),
});

/**
 * Reference search tool schema
 */
export const ReferenceSearchResultSchema = z.object({
  foundReferences: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
      relevanceScore: z.number().min(0).max(1),
      excerpt: z.string(),
    })
  ),
  totalMatches: z.number().int().nonnegative(),
  searchQuery: z.string(),
});

/**
 * Similarity check tool schema
 */
export const SimilarityCheckResultSchema = z.object({
  hasSuspiciousSimilarity: z.boolean(),
  matches: z.array(
    z.object({
      submissionId: z.string(),
      studentName: z.string().optional(),
      similarity: z.number().min(0).max(1),
      matchedSegments: z.array(z.string()).optional(),
    })
  ),
  recommendation: z.string(),
  checked: z.number().int().nonnegative(),
});

/**
 * Agent step schema
 */
export const AgentStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  reasoning: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
  timestamp: z.date(),
});

/**
 * Agent grading result schema
 */
export const AgentGradingResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      breakdown: z.array(
        z.object({
          criteriaId: z.string(),
          name: z.string(),
          score: z.number(),
          feedback: z.string(),
        })
      ),
      overallFeedback: z.string(),
      summary: z.string().optional(),
    })
    .optional(),
  steps: z.array(AgentStepSchema),
  confidenceScore: z.number().min(0).max(1),
  requiresReview: z.boolean(),
  totalTokens: z.number().int().nonnegative(),
  executionTimeMs: z.number().int().nonnegative(),
  error: z.string().optional(),
});

/**
 * Tool input schemas
 */

export const AnalyzeRubricInputSchema = z.object({
  rubricName: z.string(),
  criteria: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      maxScore: z.number().int().positive(),
    })
  ),
});

export const ParseContentInputSchema = z.object({
  content: z.string(),
  assignmentType: z.enum(['essay', 'code', 'math', 'report', 'other']),
});

export const SearchReferenceInputSchema = z.object({
  query: z.string().min(1),
  referenceDocuments: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
    })
  ),
  topK: z.number().int().positive().default(3).optional(),
});

export const CheckSimilarityInputSchema = z.object({
  currentSubmission: z.string(),
  assignmentAreaId: z.string(),
  threshold: z.number().min(0).max(1).default(0.8).optional(),
});

export const CalculateConfidenceInputSchema = z.object({
  rubricCoverage: z.number().min(0).max(1),
  evidenceQuality: z.enum(['high', 'medium', 'low']),
  criteriaAmbiguity: z.number().min(0).max(1),
});

export const GenerateFeedbackInputSchema = z.object({
  criteriaScores: z.array(
    z.object({
      criteriaId: z.string(),
      name: z.string(),
      score: z.number(),
      maxScore: z.number(),
      evidence: z.string(),
    })
  ),
  overallObservation: z.string(),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
});
