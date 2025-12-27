import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Download, Eye, FileText, Calendar } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getAssignmentAreaById } from '@/services/assignment-area.server';
import { listSubmissionsByAssignment, type SubmissionInfo } from '@/services/submission.server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                {assignmentArea.name}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {assignmentArea.course?.name} · {t('teacher.subtitle')}
              </p>
            </div>
            <Link
              to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}
              className="border-2 border-[#2B2B2B] px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-gray-900"
            >
              {t('teacher.actions.manageAssignment')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Statistics - Sketch Cards */}
        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="border-2 border-[#2B2B2B] p-6 dark:border-gray-200">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('teacher.stats.totalSubmissions')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.total}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('teacher.stats.graded')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.graded}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('teacher.stats.analyzed')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.analyzed}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('teacher.stats.pendingReview')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.pending}</p>
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
                <div
                  key={submission.id}
                  className={`px-6 py-6 transition-colors hover:bg-[#D2691E]/5 dark:hover:bg-[#E87D3E]/10 ${
                    index < submissions.length - 1 ? 'border-b border-[#2B2B2B] dark:border-gray-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Student Info */}
                    <div className="flex items-center space-x-4">
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
                            {submission.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{submission.student?.email || 'No email'}</p>
                        <div className="mt-1 flex items-center text-xs text-gray-600 dark:text-gray-400">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(submission.uploadedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      {submission.finalScore !== null && (
                        <div className="text-right">
                          <p className="font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
                            {submission.finalScore}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{t('teacher.submissionInfo.score')}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link
                          to={`/teacher/submissions/${submission.id}/view`}
                          className="border-2 border-[#2B2B2B] px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#D2691E] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:border-[#E87D3E] dark:hover:bg-[#E87D3E] dark:hover:text-white"
                        >
                          <Eye className="mr-1 inline-block h-4 w-4" />
                          {t('teacher.actions.view')}
                        </Link>
                        {submission.filePath && (
                          <a
                            href={submission.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-2 border-[#2B2B2B] px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#2B2B2B] hover:text-[#2B2B2B] dark:border-gray-200 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <Download className="mr-1 inline-block h-4 w-4" />
                            {t('teacher.actions.download')}
                          </a>
                        )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
