/**
 * Agent-based Grading System Types
 *
 * TypeScript definitions for AI SDK 6 Agent grading functionality
 */

import type { AIGradingResult } from '@/services/ai-sdk-provider.server';

/**
 * Single step in Agent execution
 */
export interface AgentStep {
  stepNumber: number;
  toolName?: string; // undefined for pure reasoning steps
  toolInput?: unknown;
  toolOutput?: unknown;
  reasoning?: string; // AI's reasoning process
  durationMs: number;
  timestamp: Date;
}

/**
 * Complete Agent grading result
 */
export interface AgentGradingResult {
  success: boolean;
  data?: AIGradingResult; // Standard grading result format
  steps: AgentStep[];
  confidenceScore: number; // 0-1
  requiresReview: boolean;
  totalTokens: number;
  executionTimeMs: number;
  interrupted?: boolean;
  interruptionReasonCode?: string;
  interruptionReason?: string;
  toolCallStats?: {
    total: number;
    byTool: Record<string, number>;
  };
  error?: string;
}

/**
 * Confidence scoring tool result
 */
export interface ConfidenceScore {
  confidenceScore: number; // 0-1
  shouldReview: boolean;
  reason: string;
  factors: {
    rubricCoverage: number;
    evidenceQuality: 'high' | 'medium' | 'low';
    criteriaAmbiguity: number;
  };
}

/**
 * Reference search tool result
 */
export interface ReferenceSearchResult {
  foundReferences: Array<{
    fileName: string;
    content: string;
    relevanceScore: number;
    excerpt: string; // First 500 chars
  }>;
  totalMatches: number;
  searchQuery: string;
}

/**
 * Similarity check tool result
 */
export interface SimilarityCheckResult {
  hasSuspiciousSimilarity: boolean;
  matches: Array<{
    submissionId: string;
    studentName?: string;
    similarity: number; // 0-1
    matchedSegments?: string[];
  }>;
  recommendation: string;
  checked: number; // Number of submissions checked
}

/**
 * Reference document for context
 */
export interface ReferenceDocument {
  fileId: string;
  fileName: string;
  content: string;
  contentLength: number;
  wasTruncated: boolean;
}

/**
 * Parsed rubric criterion for Agent processing
 */
export interface ParsedCriterion {
  criteriaId: string;
  name: string;
  description: string;
  maxScore: number;
  levels?: Array<{
    score: number;
    description: string;
  }>;
}

/**
 * Agent grading request parameters
 */
export interface AgentGradingParams {
  // Submission data
  submissionId: string;
  uploadedFileId: string;
  fileName: string;
  content: string;

  // Rubric data
  rubricId: string;
  rubricName: string;
  criteria: ParsedCriterion[];

  // Optional context
  referenceDocuments?: ReferenceDocument[];
  customInstructions?: string;
  assignmentType?: 'essay' | 'code' | 'math' | 'report' | 'other';
  assignmentTitle?: string;
  assignmentDescription?: string;

  // Metadata
  userId: string;
  resultId: string;
  sessionId?: string; // For real-time streaming
  userLanguage?: string;

  // Agent configuration
  maxSteps?: number; // Default: 10
  confidenceThreshold?: number; // Default: 0.7
  enableSimilarityCheck?: boolean; // Default: true
  useDirectGrading?: boolean; // Default: false

  // Multi-model judge (spec 020): which provider to run this agent against.
  // Defaults to 'gemini' for backward compatibility.
  provider?: JudgeProvider;
}

export type JudgeProvider = 'gemini' | 'openai' | 'anthropic';

export const JUDGE_MODEL_NAMES: Record<JudgeProvider, string> = {
  gemini: 'gemini-3.1-flash-lite',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};
