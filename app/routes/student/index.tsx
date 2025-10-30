import { useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { DashboardContent } from '@/components/student/DashboardContent';
import type { LoaderData } from './layout';

/**
 * Student Dashboard - 首頁 tab
 * 顯示待交作業和最近繳交記錄
 *
 * Note: WebSocket connection and assignment store initialization
 * are now handled in the parent layout to prevent reconnection on navigation.
 */
export default function StudentDashboardPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, assignments, submissions } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const dashboardData = useMemo(
    () => ({
      student,
      assignments,
      submissions,
    }),
    [student.id, assignments.length, submissions.length]
  );

  return <DashboardContent data={dashboardData} />;
}
