import { useRouteLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { useMemo } from 'react';
import { CoursesContent } from '@/components/student/CoursesContent';
import { ErrorPage } from '@/components/errors/ErrorPage';
import type { LoaderData } from '../layout';

/**
 * Student Courses Tab - 顯示已加入的課程列表
 */
export default function StudentCoursesPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, courses } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const coursesData = useMemo(() => {
    return {
      student,
      courses,
    };
  }, [student.id, courses.length]);

  return <CoursesContent data={coursesData} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.course"
        returnTo="/student"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.course"
      returnTo="/student"
    />
  );
}
