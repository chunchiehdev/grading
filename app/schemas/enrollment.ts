import { z } from 'zod';

/**
 * Schema for validating enrollment requests
 */
export const enrollmentSchema = z.object({
  classId: z.string().uuid('Invalid class ID format'),
  courseId: z.string().uuid('Invalid course ID format'),
  studentId: z.string().uuid('Invalid student ID format').optional(),
});

/**
 * Schema for the request body of create enrollment endpoint
 */
export const createEnrollmentSchema = enrollmentSchema.pick({
  classId: true,
  courseId: true,
});

/**
 * Schema for course discovery query parameters
 */
export const courseDiscoveryQuerySchema = z.object({
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
  sort: z.enum(['newest', 'teacher', 'name']).default('newest').optional(),
  search: z.string().optional(),
});

// Type exports for use in handlers
export type EnrollmentRequest = z.infer<typeof createEnrollmentSchema>;
export type CourseDiscoveryQuery = z.infer<typeof courseDiscoveryQuerySchema>;
