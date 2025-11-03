import {
  Outlet,
  useLocation,
  useNavigate,
  type LoaderFunctionArgs,
  type ClientLoaderFunctionArgs,
  Link,
  useRouteLoaderData,
} from 'react-router';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { getRecentSubmissionsForTeacher, type SubmissionInfo } from '@/services/submission.server';
import { listRubrics } from '@/services/rubric.server';
import { useWebSocketStatus, useWebSocketEvent } from '@/lib/websocket';
import { useSubmissionStore } from '@/stores/submissionStore';
import { perfMonitor } from '@/utils/performance-monitor';

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
  perfMonitor.start('teacher-layout-loader', { type: 'server' });

  perfMonitor.start('teacher-layout-auth');
  const teacher = await requireTeacher(request);
  perfMonitor.end('teacher-layout-auth');

  perfMonitor.start('teacher-layout-data-fetch');
  const [courses, recentSubmissions, rubricsData] = await Promise.all([
    perfMonitor.measure('fetch-teacher-courses', () => getTeacherCourses(teacher.id), { teacherId: teacher.id }),
    perfMonitor.measure('fetch-recent-submissions', () => getRecentSubmissionsForTeacher(teacher.id), {
      teacherId: teacher.id,
    }),
    perfMonitor.measure('fetch-teacher-rubrics', () => listRubrics(teacher.id), { teacherId: teacher.id }),
  ]);
  perfMonitor.end('teacher-layout-data-fetch', {
    coursesCount: courses.length,
    submissionsCount: recentSubmissions.length,
    rubricsCount: rubricsData.rubrics?.length || 0,
  });

  const rubrics = rubricsData.rubrics || [];

  perfMonitor.end('teacher-layout-loader');

  return {
    user: teacher,
    teacher,
    courses,
    recentSubmissions,
    rubrics,
    _timestamp: Date.now(),
  };
}

// Client-side cache with 5-minute TTL
// Teacher data doesn't change frequently, longer cache improves UX
let clientCache: TeacherLoaderData | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Client loader - implements caching to avoid unnecessary refetches
export async function clientLoader({ request, serverLoader }: ClientLoaderFunctionArgs) {
  perfMonitor.start('teacher-layout-client-loader');

  // Check if we have valid cached data
  if (clientCache && Date.now() - clientCache._timestamp < CACHE_TTL) {
    perfMonitor.mark('teacher-layout-cache-hit', { age: Date.now() - clientCache._timestamp });
    perfMonitor.end('teacher-layout-client-loader', { cached: true });
    return clientCache;
  }

  perfMonitor.mark('teacher-layout-cache-miss');

  // Fetch fresh data from server
  perfMonitor.start('teacher-layout-server-fetch');
  const data = await serverLoader<TeacherLoaderData>();
  perfMonitor.end('teacher-layout-server-fetch', {
    coursesCount: data.courses.length,
    rubricsCount: data.rubrics.length,
  });

  clientCache = data;
  perfMonitor.end('teacher-layout-client-loader', { cached: false });
  return data;
}

// No hydration needed - server data is fresh enough and we have client-side cache
// Omitting `clientLoader.hydrate` (defaults to false) to prevent double loading

/**
 * Teacher Layout - 管理 tab 導航的主容器
 * 根據 URL 路徑決定當前 active tab
 * 使用 <Outlet /> 渲染子路由內容
 */
export default function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['course', 'dashboard', 'rubric']);
  const fetchNotifications = useSubmissionStore((state) => state.fetchNotifications);
  const hasFetchedRef = useRef(false);

  // Monitor WebSocket connection status (for future use)
  useWebSocketStatus();

  // Track component mount
  useEffect(() => {
    perfMonitor.mark('teacher-layout-mounted', { pathname: location.pathname });
  }, []);

  // Track route changes
  useEffect(() => {
    perfMonitor.mark('teacher-layout-route-change', { pathname: location.pathname });
  }, [location.pathname]);

  // Fetch notifications from database on mount (only once, even in Strict Mode)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      perfMonitor.start('teacher-fetch-notifications');
      fetchNotifications().finally(() => {
        perfMonitor.end('teacher-fetch-notifications');
      });
    }
  }, [fetchNotifications]);

  // NOTE: WebSocket event listener for submission-notification has been moved to root.tsx Layout
  // This ensures it works on ALL teacher pages, including those outside TeacherLayout hierarchy
  // (e.g., /teacher/submissions/:id/view)

  // Handle WebSocket reconnection - clear cache to force data reload
  useWebSocketEvent(
    'connect',
    () => {
      perfMonitor.mark('websocket-reconnected', { pathname: location.pathname });
      // Clear cache to force fresh data on next navigation
      // This ensures we don't miss any updates during disconnection
      clientCache = null;
      // Also refetch notifications immediately
      fetchNotifications();
      console.log('[Teacher WebSocket] Reconnected - cache cleared and notifications refetched');
    },
    [fetchNotifications]
  );

  // 根據 URL 路徑判斷當前 tab
  const getActiveTab = (): string => {
    const pathname = location.pathname;

    if (pathname === '/teacher' || pathname === '/teacher/') {
      return 'dashboard';
    }
    if (pathname === '/teacher/courses') {
      return 'courses';
    }
    if (pathname === '/teacher/rubrics') {
      return 'rubrics';
    }

    // 默認返回 dashboard
    return 'dashboard';
  };

  const currentTab = getActiveTab();

  // 處理 tab 變化 - 導航到對應的路由
  const handleTabChange = (tab: string) => {
    perfMonitor.start(`teacher-tab-change-to-${tab}`, { from: currentTab, to: tab });
    const routes: Record<string, string> = {
      dashboard: '/teacher',
      courses: '/teacher/courses',
      rubrics: '/teacher/rubrics',
    };
    navigate(routes[tab] || '/teacher');
    // Note: Navigation performance will be tracked by route change effect
  };

  return (
    <div>
      {/* Modern Navigation */}
      <ModernNavigation
        tabs={[
          { label: t('dashboard:title'), value: 'dashboard' },
          { label: t('course:courses'), value: 'courses' },
          { label: t('rubric:title'), value: 'rubrics' },
        ]}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        actions={
          <>
            {currentTab === 'courses' && (
              <>
                {/* 手機版：圖示按鈕，增大觸控區域 */}
                <Button asChild size="icon" className="md:hidden h-9 w-9">
                  <Link to="/teacher/courses/new">
                    <Plus className="w-5 h-5" />
                    <span className="sr-only">{t('course:new')}</span>
                  </Link>
                </Button>
                {/* 桌面版：圖示 + 文字 */}
                <Button asChild className="hidden md:flex text-sm lg:text-base px-4 lg:px-6 h-9">
                  <Link to="/teacher/courses/new">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('course:new')}
                  </Link>
                </Button>
              </>
            )}
            {currentTab === 'rubrics' && (
              <>
                {/* 手機版：圖示按鈕，增大觸控區域 */}
                <Button asChild size="icon" className="md:hidden h-9 w-9">
                  <Link to="/teacher/rubrics/new">
                    <Plus className="w-5 h-5" />
                    <span className="sr-only">{t('rubric:create')}</span>
                  </Link>
                </Button>
                {/* 桌面版：圖示 + 文字 */}
                <Button asChild className="hidden md:flex text-sm lg:text-base px-4 lg:px-6 h-9">
                  <Link to="/teacher/rubrics/new">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('rubric:create')}
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
