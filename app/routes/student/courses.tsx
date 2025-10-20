import { useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { CoursesContent } from '@/components/student/CoursesContent';
import type { LoaderData } from './layout';

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
  const coursesData = useMemo(
    () => ({
      student,
      courses,
    }),
    [student.id, courses.length]
  );

  return <CoursesContent data={coursesData} />;
}
