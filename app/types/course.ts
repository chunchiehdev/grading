/**
 * Course and enrollment types for course discovery feature
 */

/**
 * Represents a class (section) schedule information
 */
export interface ClassSchedule {
  weekday: string;
  periodCode: string;
  room: string;
}

/**
 * Represents a single class (section) with enrollment information
 */
export interface ClassCard {
  id: string;
  name: string;
  schedule: ClassSchedule;
  capacity: number | null;
  enrollmentCount: number;
  isFull: boolean;
}

/**
 * Represents a course available for discovery
 */
export interface DiscoverableCourse {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  teacher: {
    id: string;
    name: string;
    email: string;
    picture: string | null;
  };
  classes: ClassCard[];
  enrollmentStatus: 'not_enrolled' | 'enrolled';
  createdAt: string;
}

/**
 * Response from course discovery API
 */
export interface DiscoveryResponse {
  success: boolean;
  data?: {
    courses: DiscoverableCourse[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * Request body for creating an enrollment
 */
export interface EnrollmentPayload {
  classId: string;
  courseId: string;
}

/**
 * Response from enrollment API
 */
export interface EnrollmentResponse {
  success: boolean;
  data?: {
    enrollment: {
      id: string;
      studentId: string;
      classId: string;
      enrollmentDate: string;
      status: string;
    };
  };
  error?: string;
}

/**
 * Props for CourseDiscoveryContent component
 */
export interface CourseDiscoveryContentProps {
  student: {
    id: string;
    email: string;
  };
  courses: DiscoverableCourse[];
  enrolledCourseIds: Set<string>;
}
