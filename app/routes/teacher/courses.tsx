import { useRouteLoaderData } from 'react-router';
import { useMemo } from 'react';
import { TeacherCoursesContent } from '@/components/teacher/TeacherCoursesContent';
import type { TeacherLoaderData } from './layout';

/**
 * Teacher Courses Tab - 顯示課程列表
 */
export default function TeacherCoursesPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<TeacherLoaderData>('teacher-layout');

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { teacher, courses } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const coursesData = useMemo(
    () => ({
      teacher,
      courses,
    }),
    [teacher.id, courses.length]
  );

  return <TeacherCoursesContent data={coursesData} />;
}
