import { useRouteLoaderData } from 'react-router';
import { useMemo, useState, useEffect } from 'react';
import { AssignmentsContent } from '@/components/student/AssignmentsContent';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAssignmentWebSocket } from '@/hooks/useAssignmentWebSocket';
import type { LoaderData } from './layout';

/**
 * Student Assignments Tab - 顯示所有待交作業
 */
export default function StudentAssignmentsPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, assignments, courses } = parentData;

  // Initialize assignment store once on mount
  const setAssignments = useAssignmentStore((state) => state.setAssignments);
  useEffect(() => {
    setAssignments(assignments);
  }, [assignments, setAssignments]);

  // Initialize WebSocket connection once
  useAssignmentWebSocket(student.id);

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
