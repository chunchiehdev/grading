import { Outlet, useLocation, useNavigate, type LoaderFunctionArgs } from 'react-router';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { useTranslation } from 'react-i18next';
import { requireStudent } from '@/services/auth.server';
import {
  getStudentAssignments,
  getStudentSubmissions,
  type StudentAssignmentInfo,
  type SubmissionInfo,
} from '@/services/submission.server';
import { getStudentEnrolledCourses, type CourseWithEnrollmentInfo } from '@/services/enrollment.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';

export interface LoaderData {
  user: { id: string; email: string; role: string; name: string; picture?: string };
  student: { id: string; email: string; role: string; name: string };
  assignments: (StudentAssignmentInfo & { formattedDueDate?: string })[];
  submissions: (SubmissionInfo & { formattedUploadedDate: string })[];
  courses: (CourseWithEnrollmentInfo & { formattedEnrolledDate?: string })[];
  submissionHistory: any[];
}

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
  };
}

/**
 * Student Layout - 管理 tab 導航的主容器
 * 根據 URL 路徑決定當前 active tab
 * 使用 <Outlet /> 渲染子路由內容
 */
export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);

  // 根據 URL 路徑判斷當前 tab
  const getActiveTab = (): string => {
    const pathname = location.pathname;

    if (pathname === '/student' || pathname === '/student/') {
      return 'dashboard';
    }
    if (pathname === '/student/courses') {
      return 'courses';
    }
    if (pathname === '/student/assignments') {
      return 'assignments';
    }
    if (pathname === '/student/submissions') {
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
      />

      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
        <Outlet />
      </div>
    </div>
  );
}
