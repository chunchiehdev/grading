import { useRouteLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { useMemo, useState } from 'react';
import { AssignmentsContent } from '@/components/student/AssignmentsContent';
import { ErrorPage } from '@/components/errors/ErrorPage';
import type { LoaderData } from './layout';

/**
 * Student Assignments Tab - 顯示所有待交作業
 *
 * Note: WebSocket connection and assignment store initialization
 * are now handled in the parent layout to prevent reconnection on navigation.
 */
export default function StudentAssignmentsPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, courses } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const assignmentsData = useMemo(
    () => ({
      student,
      enrolledCourses: courses,
    }),
    [student.id, courses.length]
  );

  return <AssignmentsContent data={assignmentsData} externalFilter={assignmentFilter} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.assignment"
        returnTo="/student"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.assignment"
      returnTo="/student"
    />
  );
}

