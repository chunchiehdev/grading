import {
  Outlet,
  useRouteLoaderData,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
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

  return (
    <div className="h-full">
      {/* Loading indicator */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}

      <div className="h-full w-[90%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
        <Outlet />
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/student" />;
}
