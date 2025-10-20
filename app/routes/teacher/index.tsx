import { useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
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
