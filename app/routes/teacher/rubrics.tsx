import { useRouteLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { useMemo } from 'react';
import { TeacherRubricsContent } from '@/components/teacher/TeacherRubricsContent';
import { ErrorPage } from '@/components/errors/ErrorPage';
import type { TeacherLoaderData } from './layout';

/**
 * Teacher Rubrics Tab - 顯示 rubrics 列表
 */
export default function TeacherRubricsPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<TeacherLoaderData>('teacher-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { teacher, rubrics } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const rubricsData = useMemo(
    () => ({
      teacher,
      rubrics,
    }),
    [teacher.id, rubrics?.length]
  );

  return <TeacherRubricsContent data={rubricsData} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.rubric"
        returnTo="/teacher"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.rubric"
      returnTo="/teacher"
    />
  );
}
