import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { Download, Eye, FileText, Calendar, Settings } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getAssignmentAreaById } from '@/services/assignment-area.server';
import { listSubmissionsByAssignment, type SubmissionInfo } from '@/services/submission.server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorPage } from '@/components/errors/ErrorPage';

import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  assignmentArea: {
    id: string;
    name: string;
    description: string | null;
    courseId: string;
    dueDate: Date | null;
    course?: {
      id: string;
      name: string;
    };
    rubric?: {
      id: string;
      name: string;
    };
    _count?: {
      submissions: number;
    };
  };
  submissions: SubmissionInfo[];
  stats: {
    total: number;
    graded: number;
    pending: number;
    analyzed: number;
  };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;

  if (!courseId || !assignmentId) {
    throw new Response('Course ID and Assignment ID are required', { status: 400 });
  }

  const [assignmentArea, submissions] = await Promise.all([
    getAssignmentAreaById(assignmentId, teacher.id),
    listSubmissionsByAssignment(assignmentId, teacher.id),
  ]);

  if (!assignmentArea) {
    throw new Response('Assignment area not found', { status: 404 });
  }

  // Calculate submission statistics
  const stats = {
    total: submissions.length,
    graded: submissions.filter((s) => s.status === 'GRADED').length,
    analyzed: submissions.filter((s) => s.status === 'ANALYZED').length,
    pending: submissions.filter((s) => s.status === 'SUBMITTED').length,
  };

  return { teacher, assignmentArea, submissions, stats };
}

export default function AssignmentSubmissions() {
  const { teacher, assignmentArea, submissions, stats } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen">
      {/* Header - Architectural Sketch Style */}
      <header className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start justify-between gap-4 sm:block">
              <div>
                <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                  {assignmentArea.name}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {assignmentArea.course?.name} · {t('teacher.subtitle')}
                </p>
              </div>
              {/* Mobile Settings Icon */}
              <Link
                to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}
                className="mt-1 text-[#2B2B2B] transition-colors hover:text-gray-600 dark:text-gray-200 dark:hover:text-white sm:hidden"
                title={t('teacher.actions.manageAssignment')}
              >
                <Settings className="h-6 w-6" />
              </Link>
            </div>
            
            {/* Desktop Settings Icon */}
            <Link
              to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}
              className="hidden text-[#2B2B2B] transition-colors hover:text-gray-600 dark:text-gray-200 dark:hover:text-white sm:block"
              title={t('teacher.actions.manageAssignment')}
            >
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Statistics - Sketch Cards */}
        {/* Statistics - Compact Bar on Mobile, Cards on Desktop */}
        <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-200 pb-4 text-sm sm:border-0 sm:pb-0 md:mb-16 md:grid md:grid-cols-4 md:gap-6">
          <div className="flex items-center gap-2 sm:block sm:border-2 sm:border-[#2B2B2B] sm:p-6 sm:dark:border-gray-200">
            <p className="text-gray-600 dark:text-gray-400 sm:text-xs sm:uppercase sm:tracking-wider">
              {t('teacher.stats.totalSubmissions')}
              <span className="sm:hidden">:</span>
            </p>
            <p className="font-medium text-[#2B2B2B] dark:text-gray-100 sm:mt-3 sm:font-serif sm:text-4xl sm:font-light">
              {stats.total}
            </p>
          </div>
          <div className="flex items-center gap-2 transition-colors sm:block sm:border-2 sm:border-[#2B2B2B] sm:p-6 sm:hover:border-[#D2691E] sm:dark:border-gray-200 sm:dark:hover:border-[#E87D3E]">
            <p className="text-gray-600 dark:text-gray-400 sm:text-xs sm:uppercase sm:tracking-wider">
              {t('teacher.stats.graded')}
              <span className="sm:hidden">:</span>
            </p>
            <p className="font-medium text-[#2B2B2B] dark:text-gray-100 sm:mt-3 sm:font-serif sm:text-4xl sm:font-light">
              {stats.graded}
            </p>
          </div>
          <div className="flex items-center gap-2 transition-colors sm:block sm:border-2 sm:border-[#2B2B2B] sm:p-6 sm:hover:border-[#D2691E] sm:dark:border-gray-200 sm:dark:hover:border-[#E87D3E]">
            <p className="text-gray-600 dark:text-gray-400 sm:text-xs sm:uppercase sm:tracking-wider">
              {t('teacher.stats.analyzed')}
              <span className="sm:hidden">:</span>
            </p>
            <p className="font-medium text-[#2B2B2B] dark:text-gray-100 sm:mt-3 sm:font-serif sm:text-4xl sm:font-light">
              {stats.analyzed}
            </p>
          </div>
          <div className="flex items-center gap-2 transition-colors sm:block sm:border-2 sm:border-[#2B2B2B] sm:p-6 sm:hover:border-[#D2691E] sm:dark:border-gray-200 sm:dark:hover:border-[#E87D3E]">
            <p className="text-gray-600 dark:text-gray-400 sm:text-xs sm:uppercase sm:tracking-wider">
              {t('teacher.stats.pendingReview')}
              <span className="sm:hidden">:</span>
            </p>
            <p className="font-medium text-[#2B2B2B] dark:text-gray-100 sm:mt-3 sm:font-serif sm:text-4xl sm:font-light">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Submissions List - Table Style */}
        <div className="border-2 border-[#2B2B2B] dark:border-gray-200">
          <div className="border-b-2 border-[#2B2B2B] px-6 py-4 dark:border-gray-200">
            <h2 className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
              {t('teacher.studentSubmissions')}
            </h2>
          </div>

          {submissions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                {t('teacher.emptyState.noSubmissions')}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('teacher.emptyState.noSubmissionsDescription')}
              </p>
            </div>
          ) : (
            <div>
              {submissions.map((submission, index) => (
                <Link
                  key={submission.id}
                  to={`/teacher/submissions/${submission.id}/view`}
                  className={`block px-4 py-6 transition-colors hover:bg-[#D2691E]/5 dark:hover:bg-[#E87D3E]/10 sm:px-6 ${
                    index < submissions.length - 1 ? 'border-b border-[#2B2B2B] dark:border-gray-200' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Student Info */}
                    <div className="flex w-full items-start space-x-4 sm:w-auto">
                      <Avatar className="h-10 w-10 border-2 border-[#2B2B2B] dark:border-gray-200">
                        <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                        <AvatarFallback className="bg-transparent font-serif text-[#2B2B2B] dark:text-gray-200">
                          {getInitials(submission.student?.name || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-base font-light text-[#2B2B2B] dark:text-gray-100">
                            {submission.student?.name || 'Unknown Student'}
                          </h3>
                          <span className="inline-block border border-[#2B2B2B] px-2 py-0.5 text-xs uppercase tracking-wider text-[#2B2B2B] dark:border-gray-200 dark:text-gray-200">
                            {t(`status.${submission.status.toLowerCase()}`, { defaultValue: submission.status })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{submission.student?.email || 'No email'}</p>
                        <div className="mt-1 flex items-center text-xs text-gray-600 dark:text-gray-400">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(submission.uploadedAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Feedback */}
                  {submission.teacherFeedback && (
                    <div className="mt-4 border-l-2 border-[#D2691E] pl-4 dark:border-[#E87D3E]">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.feedback.teacherFeedback')}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{submission.teacherFeedback}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return <ErrorPage statusCode={400} messageKey="errors.400.missingParams" returnTo="/teacher" />;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.assignment" returnTo="/teacher" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.submission" returnTo="/teacher" />;
}
