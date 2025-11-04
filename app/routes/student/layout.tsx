import {
  Outlet,
  useRouteLoaderData,
  useNavigation,
  type LoaderFunctionArgs,
  type ClientLoaderFunctionArgs,
} from 'react-router';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { useTranslation } from 'react-i18next';
import { requireStudent } from '@/services/auth.server';
import {
  getStudentAssignments,
  getStudentSubmissions,
  type StudentAssignmentInfo,
  type SubmissionInfo,
} from '@/services/submission.server';
import { getStudentEnrolledCourses } from '@/services/enrollment.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';
import type { CourseWithEnrollmentInfo } from '@/types/student';
import { useEffect } from 'react';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useWebSocketEvent } from '@/lib/websocket';
import type { AssignmentNotification } from '@/lib/websocket/types';

export interface LoaderData {
  user: { id: string; email: string; role: string; name: string; picture?: string };
  student: { id: string; email: string; role: string; name: string };
  assignments: (StudentAssignmentInfo & { formattedDueDate?: string })[];
  submissions: (SubmissionInfo & { formattedUploadedDate: string })[];
  courses: (CourseWithEnrollmentInfo & { formattedEnrolledDate?: string })[];
  submissionHistory: any[];
  _timestamp: number;
}

// Server loader - fetches data from database
export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);

  const [assignmentsRaw, submissionsRaw, coursesRaw, submissionHistoryRaw] = await Promise.all([
    getStudentAssignments(student.id),
    getStudentSubmissions(student.id),
    getStudentEnrolledCourses(student.id),
    getSubmissionsByStudentId(student.id),
  ]);

  const assignments = assignmentsRaw.map((a) => ({
    ...a,
    formattedDueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-CA') : undefined,
  }));

  const submissions = submissionsRaw.map((s) => ({
    ...s,
    formattedUploadedDate: new Date(s.uploadedAt).toLocaleDateString('en-CA'),
  }));

  const courses = coursesRaw.map((c) => ({
    ...c,
    formattedEnrolledDate: c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString('en-CA') : undefined,
  }));

  return {
    user: student,
    student,
    assignments,
    submissions,
    courses,
    submissionHistory: submissionHistoryRaw,
    _timestamp: Date.now(),
  };
}

// Client-side cache with 5-minute TTL
// Student data doesn't change frequently, longer cache improves UX
let clientCache: LoaderData | null = null;
let pendingRequest: Promise<LoaderData> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (was 30s)

// Client loader - implements caching to avoid unnecessary refetches
// Also prevents duplicate requests during navigation
export async function clientLoader({ request, serverLoader }: ClientLoaderFunctionArgs) {
  // Check if we have valid cached data
  if (clientCache && Date.now() - clientCache._timestamp < CACHE_TTL) {
    return clientCache;
  }

  // If there's already a pending request, wait for it instead of creating a new one
  // This prevents the "canceled + 200" pattern in Network tab
  if (pendingRequest) {
    return pendingRequest;
  }

  // Fetch fresh data from server
  pendingRequest = serverLoader<LoaderData>().then((data) => {
    clientCache = data;
    pendingRequest = null;
    return data;
  });

  return pendingRequest;
}

// No hydration needed - server data is fresh enough and we have client-side cache
// Omitting `clientLoader.hydrate` (defaults to false) to prevent double loading

/**
 * Student Layout - 管理 tab 導航的主容器
 * 使用 NavLink 自動處理 active state
 * 使用 <Outlet /> 渲染子路由內容
 */
export default function StudentLayout() {
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);
  const data = useRouteLoaderData<LoaderData>('student-layout');
  const navigation = useNavigation();
  const handleNewAssignment = useAssignmentStore((state) => state.handleNewAssignment);

  // Track navigation loading state
  const isNavigating = navigation.state === 'loading';

  // Initialize assignment store at layout level (once for all student pages)
  useEffect(() => {
    if (data?.assignments) {
      const setAssignments = useAssignmentStore.getState().setAssignments;
      setAssignments(data.assignments);
    }
  }, [data?.assignments]);

  // Monitor assignment notification events (connection managed at Root layout)
  useWebSocketEvent(
    'assignment-notification',
    async (notification: AssignmentNotification) => {
      await handleNewAssignment(notification);
    },
    [handleNewAssignment]
  );

  // Handle WebSocket reconnection - clear cache to force data reload
  useWebSocketEvent(
    'connect',
    () => {
      // Clear cache to force fresh data on next navigation
      // This ensures we don't miss any updates during disconnection
      clientCache = null;
      console.log('[Student WebSocket] Reconnected - cache cleared for fresh data');
    },
    []
  );

  return (
    <div>
      {/* Loading indicator */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}

      {/* Modern Navigation */}
      <ModernNavigation
        tabs={[
          { label: t('dashboard:title'), value: 'dashboard', to: '/student' },
          { label: t('course:courses'), value: 'courses', to: '/student/courses' },
          { label: t('course:assignments'), value: 'assignments', to: '/student/assignments' },
          { label: t('course:assignment.submissions'), value: 'submissions', to: '/student/submissions' },
        ]}
      />

      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
        <Outlet />
      </div>
    </div>
  );
}
