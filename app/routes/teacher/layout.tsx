import {
  Outlet,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useEffect, useRef } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { getRecentSubmissionsForTeacher, type SubmissionInfo } from '@/services/submission.server';
import { listRubrics } from '@/services/rubric.server';
import { useWebSocketStatus, useWebSocketEvent } from '@/lib/websocket';
import { useSubmissionStore } from '@/stores/submissionStore';

export interface TeacherLoaderData {
  user: { id: string; email: string; name: string; role: string; picture?: string };
  teacher: { id: string; email: string; name: string; role: string };
  courses: CourseInfo[];
  recentSubmissions: SubmissionInfo[];
  rubrics: any[];
  _timestamp: number;
}

// Server loader - fetches data from database
export async function loader({ request }: LoaderFunctionArgs): Promise<TeacherLoaderData> {
  const teacher = await requireTeacher(request);

  const [courses, recentSubmissions, rubricsData] = await Promise.all([
    getTeacherCourses(teacher.id),
    getRecentSubmissionsForTeacher(teacher.id),
    listRubrics(teacher.id),
  ]);

  const rubrics = rubricsData.rubrics || [];

  return {
    user: teacher,
    teacher,
    courses,
    recentSubmissions,
    rubrics,
    _timestamp: Date.now(),
  };
}



/**
 * Teacher Layout - 管理 tab 導航的主容器
 * 使用 NavLink 自動處理 active state
 * 使用 <Outlet /> 渲染子路由內容
 */
export default function TeacherLayout() {
  const navigation = useNavigation();
  const fetchNotifications = useSubmissionStore((state) => state.fetchNotifications);
  const hasFetchedRef = useRef(false);

  // Track navigation loading state
  const isNavigating = navigation.state === 'loading';

  // Monitor WebSocket connection status (for future use)
  useWebSocketStatus();

  // Fetch notifications from database on mount (only once, even in Strict Mode)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // NOTE: WebSocket event listener for submission-notification has been moved to root.tsx Layout
  // This ensures it works on ALL teacher pages, including those outside TeacherLayout hierarchy
  // (e.g., /teacher/submissions/:id/view)

  // Handle WebSocket reconnection - refetch notifications immediately
  useWebSocketEvent(
    'connect',
    () => {
      // Refetch notifications immediately on reconnection
      fetchNotifications();
      
    },
    [fetchNotifications]
  );

  return (
    <div>
      {/* Loading indicator */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}

      <div className="w-[90%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto py-6">
        <Outlet />
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/teacher" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/teacher" />;
}
