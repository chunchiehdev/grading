/**
 * Shared type definitions for Student-related features
 *
 * This file centralizes all student-related types to maintain a single source of truth
 * and prevent duplication across components and services.
 */

/**
 * Student user information
 */
export interface StudentInfo {
  id: string;
  email: string;
  role: string;
  name: string;
  picture?: string;
}

/**
 * Submission information with all related data
 */
export interface SubmissionInfo {
  id: string;
  studentId: string;
  assignmentAreaId: string;
  filePath: string;
  uploadedAt: Date;
  aiAnalysisResult: any | null;
  finalScore: number | null;
  teacherFeedback: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  assignmentArea: {
    id: string;
    name: string;
    description: string | null;
    dueDate: Date | null;
    course: {
      id: string;
      name: string;
      teacher: {
        email: string;
      };
    };
    rubric: {
      id: string;
      name: string;
      description: string;
      criteria: any;
    };
  };
}

/**
 * Assignment information from student's perspective
 */
export interface StudentAssignmentInfo {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  courseId: string;
  course: {
    id: string;
    name: string;
    teacher: {
      id: string;
      email: string;
      name: string;
      picture: string;
    };
  };
  class?: {
    id: string;
    name: string;
  } | null;
  rubric: {
    id: string;
    name: string;
    description: string;
    criteria: any;
  };
  submissions: Array<{
    id?: string;
    studentId: string;
    status: string;
    finalScore: number | null;
    uploadedAt?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Course information with enrollment details
 */
export interface CourseWithEnrollmentInfo {
  id: string;
  name: string;
  description: string | null;
  teacher: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
  _count: {
    enrollments: number;
    assignmentAreas: number;
  };
  enrolledAt?: Date;
}
