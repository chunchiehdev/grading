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

/**
 * Teacher submission view data - flattened for display
 *
 * This type represents the optimized data structure for the teacher submission review page.
 * All nullable fields from the database have been resolved with fallback values,
 * eliminating the need for defensive programming (?.  operators) in the UI layer.
 *
 * Design principles:
 * - Flat structure grouped by UI concern (student, assignment, grading, navigation)
 * - Pre-formatted display strings to keep UI layer pure
 * - No nullable fields except where null has semantic meaning (e.g., finalScore)
 */
export interface TeacherSubmissionView {
  /** Student information with guaranteed non-null values */
  student: {
    /** Student display name (fallback: "Unknown Student") */
    name: string;
    /** Student email (fallback: "No email") */
    email: string;
    /** Avatar URL, null if not available */
    picture: string | null;
    /** First character of name for avatar fallback (fallback: "U") */
    initial: string;
  };
  /** Assignment and course information */
  assignment: {
    /** Assignment area ID */
    id: string;
    /** Assignment area name */
    name: string;
    /** Assignment description, null if not provided */
    description: string | null;
    /** Due date as ISO string, null if no deadline */
    dueDate: string | null;
    /** Formatted due date for display (server-rendered to avoid hydration mismatch) */
    formattedDueDate?: string | null;
    /** Parent course information */
    course: {
      /** Course ID */
      id: string;
      /** Course name */
      name: string;
    };
  };
  /** Grading and submission information */
  grading: {
    /** Final score from teacher, null if not graded yet */
    finalScore: number | null;
    /** AI-generated normalized score (0-100), null if not available */
    normalizedScore: number | null;
    /** Upload timestamp as ISO string (format in UI with toLocaleString) */
    uploadedAt: string;
    /** Formatted upload timestamp for display (server-rendered to avoid hydration mismatch) */
    formattedUploadedAt?: string;
    /** File download URL, null if file not available */
    filePath: string | null;
    /** Teacher feedback text, null if not provided */
    teacherFeedback: string | null;
    /** AI analysis result JSON, null if analysis incomplete */
    aiAnalysisResult: any | null;
    /** Context transparency metadata (Feature 004), null if no context was used */
    usedContext: any | null;
  };
  /** Navigation URLs pre-computed for UI */
  navigation: {
    /** URL to return to submissions list */
    backUrl: string;
  };
}
