import { useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { SubmissionsContent } from '@/components/student/SubmissionsContent';
import type { LoaderData } from './layout';

/**
 * Student Submissions Tab - 顯示繳交記錄
 */
export default function StudentSubmissionsPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, submissionHistory } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const submissionsData = useMemo(
    () => ({
      student,
      submissions: submissionHistory,
    }),
    [student.id, submissionHistory.length]
  );

  return <SubmissionsContent data={submissionsData} />;
}
