import { useRouteLoaderData } from 'react-router';
import { useMemo, useEffect } from 'react';
import { CoursesContent } from '@/components/student/CoursesContent';
import type { LoaderData } from '../layout';
import { perfMonitor } from '@/utils/performance-monitor';

/**
 * Student Courses Tab - 顯示已加入的課程列表
 */
export default function StudentCoursesPage() {
  // 從 parent layout 獲取 loader 數據
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  useEffect(() => {
    perfMonitor.mark('student-courses-page-mounted', {
      coursesCount: parentData?.courses.length || 0,
    });
  }, []);

  if (!parentData) {
    return <div>Loading...</div>;
  }

  const { student, courses } = parentData;

  // Memoize props to prevent unnecessary re-renders
  const coursesData = useMemo(() => {
    perfMonitor.start('student-courses-memo');
    const data = {
      student,
      courses,
    };
    perfMonitor.end('student-courses-memo', { coursesCount: courses.length });
    return data;
  }, [student.id, courses.length]);

  return <CoursesContent data={coursesData} />;
}
