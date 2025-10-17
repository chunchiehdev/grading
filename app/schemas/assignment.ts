/**
 * Zod validation schemas for assignment operations
 * Feature 004: AI Grading with Knowledge Base Context
 */

import { z } from 'zod';

/**
 * Schema for creating a new assignment with optional reference materials
 */
export const createAssignmentSchema = z.object({
  name: z.string().min(1, 'Assignment name is required').max(255, 'Assignment name must be less than 255 characters'),
  description: z.string().optional(),
  courseId: z.string().uuid('Invalid course ID'),
  classId: z.string().uuid('Invalid class ID').optional().nullable(),
  rubricId: z.string().uuid('Invalid rubric ID'),
  dueDate: z.string().datetime('Invalid date format').optional().nullable(),

  // Feature 004: Reference materials and custom instructions
  referenceFileIds: z
    .array(z.string().uuid('Invalid file ID'))
    .max(5, 'Maximum 5 reference files allowed')
    .optional()
    .nullable(),

  customGradingPrompt: z
    .string()
    .max(5000, 'Custom grading instructions must be less than 5000 characters')
    .optional()
    .nullable(),
});

/**
 * Schema for updating an assignment
 */
export const updateAssignmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),

  // Feature 004: Allow updating reference materials and instructions
  referenceFileIds: z
    .array(z.string().uuid())
    .max(5, 'Maximum 5 reference files allowed')
    .optional()
    .nullable(),

  customGradingPrompt: z
    .string()
    .max(5000, 'Custom grading instructions must be less than 5000 characters')
    .optional()
    .nullable(),
});

/**
 * Schema for assignment ID parameter
 */
export const assignmentIdSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
});

/**
 * Type exports for TypeScript
 */
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type AssignmentIdInput = z.infer<typeof assignmentIdSchema>;
