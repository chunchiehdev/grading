import {
  Outlet,
  useLocation,
  useNavigate,
  useRouteLoaderData,
  type LoaderFunctionArgs,
  type ClientLoaderFunctionArgs,
  Link,
} from 'react-router';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
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
import { perfMonitor } from '@/utils/performance-monitor';

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
  perfMonitor.start('student-layout-loader', { type: 'server' });

  perfMonitor.start('student-layout-auth');
  const student = await requireStudent(request);
  perfMonitor.end('student-layout-auth');

  perfMonitor.start('student-layout-data-fetch');
  const [assignmentsRaw, submissionsRaw, coursesRaw, submissionHistoryRaw] = await Promise.all([
    perfMonitor.measure('fetch-student-assignments', () => getStudentAssignments(student.id), {
      studentId: student.id,
    }),
    perfMonitor.measure('fetch-student-submissions', () => getStudentSubmissions(student.id), {
      studentId: student.id,
    }),
    perfMonitor.measure('fetch-student-courses', () => getStudentEnrolledCourses(student.id), { studentId: student.id }),
    perfMonitor.measure('fetch-submission-history', () => getSubmissionsByStudentId(student.id), {
      studentId: student.id,
    }),
  ]);
  perfMonitor.end('student-layout-data-fetch', {
    assignmentsCount: assignmentsRaw.length,
    submissionsCount: submissionsRaw.length,
    coursesCount: coursesRaw.length,
    historyCount: submissionHistoryRaw.length,
  });

  perfMonitor.start('student-layout-data-transform');
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
  perfMonitor.end('student-layout-data-transform');

  perfMonitor.end('student-layout-loader');

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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (was 30s)

// Client loader - implements caching to avoid unnecessary refetches
export async function clientLoader({ request, serverLoader }: ClientLoaderFunctionArgs) {
  perfMonitor.start('student-layout-client-loader');

  // Check if we have valid cached data
  if (clientCache && Date.now() - clientCache._timestamp < CACHE_TTL) {
    perfMonitor.mark('student-layout-cache-hit', { age: Date.now() - clientCache._timestamp });
    perfMonitor.end('student-layout-client-loader', { cached: true });
    return clientCache;
  }

  perfMonitor.mark('student-layout-cache-miss');

  // Fetch fresh data from server
  perfMonitor.start('student-layout-server-fetch');
  const data = await serverLoader<LoaderData>();
  perfMonitor.end('student-layout-server-fetch', {
    assignmentsCount: data.assignments.length,
    coursesCount: data.courses.length,
  });

  clientCache = data;
  perfMonitor.end('student-layout-client-loader', { cached: false });
  return data;
}

// No hydration needed - server data is fresh enough and we have client-side cache
// Omitting `clientLoader.hydrate` (defaults to false) to prevent double loading

/**
 * Student Layout - 管理 tab 導航的主容器
 * 根據 URL 路徑決定當前 active tab
 * 使用 <Outlet /> 渲染子路由內容
 */
export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);
  const data = useRouteLoaderData<LoaderData>('student-layout');
  const handleNewAssignment = useAssignmentStore((state) => state.handleNewAssignment);

  // Track component mount
  useEffect(() => {
    perfMonitor.mark('student-layout-mounted', { pathname: location.pathname });
  }, []);

  // Track route changes
  useEffect(() => {
    perfMonitor.mark('student-layout-route-change', { pathname: location.pathname });
  }, [location.pathname]);

  // Initialize assignment store at layout level (once for all student pages)
  useEffect(() => {
    if (data?.assignments) {
      perfMonitor.start('student-layout-init-store');
      const setAssignments = useAssignmentStore.getState().setAssignments;
      setAssignments(data.assignments);
      perfMonitor.end('student-layout-init-store', { count: data.assignments.length });
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
      perfMonitor.mark('websocket-reconnected', { pathname: location.pathname });
      // Clear cache to force fresh data on next navigation
      // This ensures we don't miss any updates during disconnection
      clientCache = null;
      console.log('[Student WebSocket] Reconnected - cache cleared for fresh data');
    },
    []
  );

  // 根據 URL 路徑判斷當前 tab
  const getActiveTab = (): string => {
    const pathname = location.pathname;

    if (pathname === '/student' || pathname === '/student/') {
      return 'dashboard';
    }
    if (pathname.startsWith('/student/courses')) {
      return 'courses';
    }
    if (pathname.startsWith('/student/assignments')) {
      return 'assignments';
    }
    if (pathname.startsWith('/student/submissions')) {
      return 'submissions';
    }

    // 默認返回 dashboard
    return 'dashboard';
  };

  const currentTab = getActiveTab();

  // 處理 tab 變化 - 導航到對應的路由
  const handleTabChange = (tab: string) => {
    perfMonitor.start(`student-tab-change-to-${tab}`, { from: currentTab, to: tab });
    const routes: Record<string, string> = {
      dashboard: '/student',
      courses: '/student/courses',
      assignments: '/student/assignments',
      submissions: '/student/submissions',
    };
    navigate(routes[tab] || '/student');
    // Note: Navigation performance will be tracked by route change effect
  };

  return (
    <div>
      {/* Modern Navigation */}
      <ModernNavigation
        tabs={[
          { label: t('dashboard:title'), value: 'dashboard' },
          { label: t('course:courses'), value: 'courses' },
          { label: t('course:assignments'), value: 'assignments' },
          { label: t('course:assignment.submissions'), value: 'submissions' },
        ]}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        actions={
          <>
            {currentTab === 'courses' && (
              <>
                {/* 手機版：圖示按鈕，增大觸控區域 */}
                <Button asChild size="icon" className="md:hidden h-9 w-9">
                  <Link to="/student/courses/discover">
                    <Compass className="w-5 h-5" />
                    <span className="sr-only">{t('course:discovery.discover')}</span>
                  </Link>
                </Button>
                {/* 桌面版：圖示 + 文字 */}
                <Button asChild className="hidden md:flex text-sm lg:text-base px-4 lg:px-6 h-9">
                  <Link to="/student/courses/discover">
                    <Compass className="w-4 h-4 mr-2" />
                    {t('course:discovery.discover')}
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
        <Outlet />
      </div>
    </div>
  );
}
