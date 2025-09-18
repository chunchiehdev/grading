import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useState } from 'react';

import { requireStudent } from '@/services/auth.server';
import {
  getStudentAssignments,
  getStudentSubmissions,
  type StudentAssignmentInfo,
  type SubmissionInfo,
} from '@/services/submission.server';
import { getStudentEnrolledCourses, type CourseWithEnrollmentInfo } from '@/services/enrollment.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';
import { Button } from '@/components/ui/button';
import { ModernNavigation } from '@/components/ui/modern-navigation';
import { DashboardContent } from '@/components/student/DashboardContent';
import { CoursesContent } from '@/components/student/CoursesContent';
import { AssignmentsContent } from '@/components/student/AssignmentsContent';
import { SubmissionsContent } from '@/components/student/SubmissionsContent';

import { useTranslation } from 'react-i18next';

interface LoaderData {
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

  return { student, assignments, submissions, courses, submissionHistory: submissionHistoryRaw };
}

export default function StudentDashboard() {
  const { student, assignments, submissions, courses, submissionHistory } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    switch (currentTab) {
      case 'courses':
        return <CoursesContent data={{ student, courses }} />;
      case 'assignments':
        return <AssignmentsContent data={{ student, assignments, enrolledCourses: courses }} />;
      case 'submissions':
        return <SubmissionsContent data={{ student, submissions: submissionHistory }} />;
      default:
        return <DashboardContent data={{ student, assignments, submissions }} />;
    }
  };

  return (
    <div>
      {/* Modern Navigation */}
      <ModernNavigation
        tabs={[
          { label: t('dashboard:title'), value: 'dashboard' },
          { label: t('course:courses'), value: 'courses' },
          { label: t('course:assignments'), value: 'assignments' },
          { label: t('course:assignment.submissions'), value: 'submissions' }
        ]}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        actions={
          <>
            <Button variant="outline" className="text-sm md:text-base lg:text-lg px-3 md:px-4 lg:px-6">
              {t('course:joinCourse.joinCourse')}
            </Button>
            <Button className="text-sm md:text-base lg:text-lg px-3 md:px-4 lg:px-6">
              + {t('course:quickSubmit', '快速提交')}
            </Button>
          </>
        }
      />

      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto pt-6 md:pt-8 lg:pt-10 xl:pt-12 2xl:pt-16">
        {renderContent()}
      </div>
    </div>
  );
}
