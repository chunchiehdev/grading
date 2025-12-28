import { useRouteError, isRouteErrorResponse, Outlet } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';

/**
 * Student Courses Sub-Layout
 * Provides navigation for course-related routes (discover, course detail, etc.)
 * Note: No additional padding here - parent StudentLayout already handles width constraints
 */
export default function StudentCoursesLayout() {
  return <Outlet />;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/student" />;
}
