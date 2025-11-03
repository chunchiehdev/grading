/**
 * Assignment-related TypeScript type definitions
 * Feature 004: AI Grading with Knowledge Base Context
 */

import type { AssignmentArea, UploadedFile } from '@/types/database';

/**
 * Assignment with populated reference files
 * Used in assignment detail views and grading context loading
 */
export interface AssignmentAreaWithReferences extends AssignmentArea {
  referenceFiles?: UploadedFile[];
}

/**
 * Reference file usage metadata for transparency
 * Tracks which files were actually used in grading and if they were truncated
 */
export interface ReferenceFileUsage {
  fileId: string;
  fileName: string;
  contentLength: number;
  wasTruncated: boolean;
}

/**
 * Context information used during grading
 * Provides transparency about what context the AI used
 */
export interface GradingContext {
  assignmentAreaId: string | null;
  referenceFilesUsed: ReferenceFileUsage[];
  customInstructionsUsed: boolean;
}

/**
 * Assignment creation/update request with reference files
 */
export interface AssignmentCreateRequest {
  name: string;
  description?: string;
  courseId: string;
  classId?: string;
  rubricId: string;
  dueDate?: string;
  referenceFileIds?: string[]; // Array of UploadedFile IDs (max 5)
  customGradingPrompt?: string; // Custom instructions (max 5000 chars)
}

/**
 * Assignment update request
 */
export interface AssignmentUpdateRequest {
  referenceFileIds?: string[] | null; // null removes all references
  customGradingPrompt?: string | null; // null removes instructions
}
