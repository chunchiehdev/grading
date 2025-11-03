import { Outlet } from 'react-router';

/**
 * Student Courses Sub-Layout
 * Provides navigation for course-related routes (discover, course detail, etc.)
 * Note: No additional padding here - parent StudentLayout already handles width constraints
 */
export default function StudentCoursesLayout() {
  return <Outlet />;
}
