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
interface ClassCard {
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
 * Props for CourseDiscoveryContent component
 */
export interface CourseDiscoveryContentProps {
  student: {
    id: string;
    email: string;
  };
  courses: DiscoverableCourse[];
  enrolledCourseIds: Set<string>;
  searchQuery?: string;
  isSearching?: boolean;
}
