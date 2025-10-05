/**
 * Shared type definitions for Teacher-related features
 *
 * This file centralizes all teacher-related types to maintain a single source of truth
 * and prevent duplication across components and services.
 */

/**
 * Teacher user information
 */
export interface TeacherInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  picture?: string;
}

/**
 * Re-export commonly used types from other modules for convenience
 */
export type { CourseInfo } from '@/services/course.server';
export type { SubmissionInfo } from '@/types/student';
export type { RubricResponse } from '@/types/rubric';

/**
 * Analytics types (inferred from analytics.server.ts return values)
 */
export type OverallTeacherStats = {
  totalCourses: number;
  totalStudents: number;
  totalSubmissions: number;
  averageScore: number;
};

export type CoursePerformance = Array<{
  id: string;
  name: string;
  submissionsCount: number;
  averageScore: number;
  statusCounts: Record<string, number>;
}>;

export type RubricUsage = Array<{
  rubricId: string;
  rubricName: string;
  usageCount: number;
}>;
