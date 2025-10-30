/**
 * Notification system types and interfaces
 * Covers notification events and data structures
 */

/**
 * Assignment notification event
 */
export interface AssignmentNotificationEvent {
  type: 'ASSIGNMENT_CREATED';
  courseId: string;
  assignmentId: string;
  assignmentName: string;
  dueDate: Date | null;
  studentIds: string[];
  teacherName: string;
}

/**
 * Notification data for database storage
 */
export interface NotificationData {
  type: 'ASSIGNMENT_CREATED' | 'ASSIGNMENT_DUE_SOON' | 'SUBMISSION_GRADED' | 'COURSE_ANNOUNCEMENT';
  userId: string;
  courseId?: string;
  assignmentId?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Enrollment with student info (for mapping)
 */
export interface EnrollmentWithStudent {
  studentId: string;
  student: {
    name: string;
    email: string;
  };
}

/**
 * Unread notification response
 */
export interface UnreadNotification {
  id: string;
  type: string;
  userId: string;
  title: string;
  message: string;
  courseId?: string;
  assignmentId?: string;
  course?: { name: string };
  assignment?: { name: string; dueDate: Date | null };
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
}
