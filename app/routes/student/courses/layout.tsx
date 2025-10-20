import { Outlet } from 'react-router';

/**
 * Student Courses Sub-Layout
 * Provides navigation for course-related routes (discover, course detail, etc.)
 */
export default function StudentCoursesLayout() {
  return (
    <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
      <Outlet />
    </div>
  );
}
