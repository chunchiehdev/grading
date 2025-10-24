import { Outlet } from 'react-router';

/**
 * Student Courses Sub-Layout
 * Provides navigation for course-related routes (discover, course detail, etc.)
 */
/**
 * Full-width layout for course pages
 * Supports responsive padding for proper spacing on all screen sizes
 * 4K friendly: uses full width with appropriate horizontal padding
 */
/**
 * Courses sub-layout - manages horizontal padding only
 * Vertical padding is handled by parent StudentLayout
 * No additional top padding to avoid double spacing
 */
export default function StudentCoursesLayout() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <Outlet />
    </div>
  );
}
