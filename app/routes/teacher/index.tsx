import { useRouteError, isRouteErrorResponse, useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ErrorPage } from '@/components/errors/ErrorPage';
import type { TeacherLoaderData } from './layout';

/**
 * Teacher Dashboard - 首頁 tab
 * 顯示統計資訊和最近繳交記錄
 */
export default function TeacherDashboardPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<TeacherLoaderData>('teacher-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { teacher, courses, recentSubmissions } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const dashboardData = useMemo(
    () => ({
      teacher,
      courses,
      recentSubmissions,
    }),
    [teacher.id, courses.length, recentSubmissions.length]
  );

  return <TeacherDashboardContent data={dashboardData} />;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/teacher" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/teacher" />;
}
