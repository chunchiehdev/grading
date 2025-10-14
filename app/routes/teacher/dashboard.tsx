import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useState, useMemo } from 'react';

import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { getRecentSubmissionsForTeacher, type SubmissionInfo } from '@/services/submission.server';
import { listRubrics } from '@/services/rubric.server';
import { getOverallTeacherStats, getCoursePerformance, getRubricUsage } from '@/services/analytics.server';
import { Button } from '@/components/ui/button';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { Plus, FileText } from 'lucide-react';

import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { TeacherCoursesContent } from '@/components/teacher/TeacherCoursesContent';
import { TeacherRubricsContent } from '@/components/teacher/TeacherRubricsContent';
import { Link } from 'react-router';
import type { TeacherInfo } from '@/types/teacher';

import { useTranslation } from 'react-i18next';

interface LoaderData {
  user: { id: string; email: string; name: string; role: string; picture?: string };
  teacher: { id: string; email: string; name: string; role: string };
  courses: CourseInfo[];
  recentSubmissions: SubmissionInfo[];
  rubrics: any[];
  analyticsStats: Awaited<ReturnType<typeof getOverallTeacherStats>>;
  analyticsCourses: Awaited<ReturnType<typeof getCoursePerformance>>;
  analyticsRubrics: Awaited<ReturnType<typeof getRubricUsage>>;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);

  const [
    courses,
    recentSubmissions,
    rubricsData,
    analyticsStats,
    analyticsCourses,
    analyticsRubrics
  ] = await Promise.all([
    getTeacherCourses(teacher.id),
    getRecentSubmissionsForTeacher(teacher.id),
    listRubrics(teacher.id),
    getOverallTeacherStats(teacher.id),
    getCoursePerformance(teacher.id),
    getRubricUsage(teacher.id),
  ]);

  const rubrics = rubricsData.rubrics || [];

  return {
    user: teacher,
    teacher,
    courses,
    recentSubmissions,
    rubrics,
    analyticsStats,
    analyticsCourses,
    analyticsRubrics
  };
}

export default function TeacherDashboard() {
  const { teacher, courses, recentSubmissions, rubrics, analyticsStats, analyticsCourses, analyticsRubrics } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['course', 'dashboard', 'rubric']);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showWebSocketTest, setShowWebSocketTest] = useState(false);

  // Memoize props to prevent unnecessary re-renders
  const dashboardData = useMemo(() => ({
    teacher,
    courses,
    recentSubmissions
  }), [teacher.id, courses.length, recentSubmissions.length]);

  const coursesData = useMemo(() => ({
    teacher,
    courses
  }), [teacher.id, courses.length]);

  const rubricsData = useMemo(() => ({
    teacher,
    rubrics
  }), [teacher.id, rubrics?.length]);

  const renderContent = () => {
    switch (currentTab) {
      case 'courses':
        return <TeacherCoursesContent data={coursesData} />;
      case 'rubrics':
        return <TeacherRubricsContent data={rubricsData} />;
      default:
        return <TeacherDashboardContent data={dashboardData} />;
    }
  };


  return (
    <div>
      
      {/* {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '60px',
          right: '10px',
          zIndex: 1000
        }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWebSocketTest(!showWebSocketTest)}
            className="text-xs"
          >
            WebSocket Test
          </Button>
        </div>
      )} */}

      {/* Modern Navigation */}
      <ModernNavigation
        tabs={[
          { label: t('dashboard:title'), value: 'dashboard' },
          { label: t('course:courses'), value: 'courses' },
          { label: t('rubric:title'), value: 'rubrics' },
        ]}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
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
        {renderContent()}
      </div>
    </div>
  );
}
