import { useRouteLoaderData } from 'react-router';
import { useEffect, useMemo } from 'react';
import { DashboardContent } from '@/components/student/DashboardContent';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAssignmentWebSocket } from '@/hooks/useAssignmentWebSocket';
import type { LoaderData } from './layout';

/**
 * Student Dashboard - 首頁 tab
 * 顯示待交作業和最近繳交記錄
 */
export default function StudentDashboardPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, assignments, submissions } = parentData;

  // Initialize assignment store once on mount
  const setAssignments = useAssignmentStore((state) => state.setAssignments);
  useEffect(() => {
    setAssignments(assignments);
  }, [assignments, setAssignments]);

  // Initialize WebSocket connection once
  useAssignmentWebSocket(student.id);

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
