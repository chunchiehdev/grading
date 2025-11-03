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

// Client-side cache with 30-second TTL
let clientCache: LoaderData | null = null;
const CACHE_TTL = 30000; // 30 seconds

// Client loader - implements caching to avoid unnecessary refetches
export async function clientLoader({ request, serverLoader }: ClientLoaderFunctionArgs) {
  // Check if we have valid cached data
  if (clientCache && Date.now() - clientCache._timestamp < CACHE_TTL) {
    return clientCache;
  }

  // Fetch fresh data from server
  const data = await serverLoader<LoaderData>();
  clientCache = data;
  return data;
}

// Enable client loader hydration
clientLoader.hydrate = true;

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
    const routes: Record<string, string> = {
      dashboard: '/student',
      courses: '/student/courses',
      assignments: '/student/assignments',
      submissions: '/student/submissions',
    };
    navigate(routes[tab] || '/student');
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
