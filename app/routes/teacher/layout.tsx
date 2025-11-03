import { Outlet, useLocation, useNavigate, type LoaderFunctionArgs, Link, useRouteLoaderData } from 'react-router';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { getRecentSubmissionsForTeacher, type SubmissionInfo } from '@/services/submission.server';
import { listRubrics } from '@/services/rubric.server';
import { useWebSocketStatus } from '@/lib/websocket';
import { useSubmissionStore } from '@/stores/submissionStore';

export interface TeacherLoaderData {
  user: { id: string; email: string; name: string; role: string; picture?: string };
  teacher: { id: string; email: string; name: string; role: string };
  courses: CourseInfo[];
  recentSubmissions: SubmissionInfo[];
  rubrics: any[];
}

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
  };
}

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

  // Monitor WebSocket connection status
  const { isConnected, connectionState } = useWebSocketStatus();

  // Fetch notifications from database on mount (only once, even in Strict Mode)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Log when location changes (navigation)
  useEffect(() => {
  }, [location.pathname]);

  // Log WebSocket connection status
  useEffect(() => {
    // Connection status monitoring can be added here if needed
  }, [isConnected, connectionState]);

  // NOTE: WebSocket event listener for submission-notification has been moved to root.tsx Layout
  // This ensures it works on ALL teacher pages, including those outside TeacherLayout hierarchy
  // (e.g., /teacher/submissions/:id/view)

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
    const routes: Record<string, string> = {
      dashboard: '/teacher',
      courses: '/teacher/courses',
      rubrics: '/teacher/rubrics',
    };
    navigate(routes[tab] || '/teacher');
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
                {/* 手機版：只顯示圖示 */}
                <Button asChild size="icon" className="md:hidden">
                  <Link to="/teacher/courses/new">
                    <Plus className="w-5 h-5" />
                  </Link>
                </Button>
                {/* 桌面版：顯示圖示 + 文字 */}
                <Button asChild className="hidden md:flex text-sm lg:text-base px-4 lg:px-6">
                  <Link to="/teacher/courses/new">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('course:new')}
                  </Link>
                </Button>
              </>
            )}
            {currentTab === 'rubrics' && (
              <>
                {/* 手機版：只顯示圖示 */}
                <Button asChild size="icon" className="md:hidden">
                  <Link to="/teacher/rubrics/new">
                    <Plus className="w-5 h-5" />
                  </Link>
                </Button>
                {/* 桌面版：顯示圖示 + 文字 */}
                <Button asChild className="hidden md:flex text-sm lg:text-base px-4 lg:px-6">
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
