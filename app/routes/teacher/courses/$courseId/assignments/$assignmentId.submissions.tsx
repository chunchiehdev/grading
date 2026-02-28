import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { FileText, Calendar, Settings, CheckCircle2, Sparkles, Hourglass } from 'lucide-react';

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
    formattedDueDate: string;
  };
  submissions: Array<SubmissionInfo & { formattedUploadedAt: string }>;
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

  const acceptLanguage = request.headers.get('accept-language') || 'en-US';
  const locale = acceptLanguage.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en-US';
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Taipei',
  });

  const formattedSubmissions = submissions.map((submission) => ({
    ...submission,
    formattedUploadedAt: dateTimeFormatter.format(new Date(submission.uploadedAt)),
  }));

  // Calculate submission statistics
  const stats = {
    total: formattedSubmissions.length,
    graded: formattedSubmissions.filter((s) => s.status === 'GRADED').length,
    analyzed: formattedSubmissions.filter((s) => s.status === 'ANALYZED').length,
    pending: formattedSubmissions.filter((s) => s.status === 'SUBMITTED').length,
  };

  return {
    teacher,
    assignmentArea: {
      ...assignmentArea,
      formattedDueDate: assignmentArea.dueDate
        ? dateFormatter.format(new Date(assignmentArea.dueDate))
        : '',
    },
    submissions: formattedSubmissions,
    stats,
  };
}

export default function AssignmentSubmissions() {
  const { assignmentArea, submissions, stats } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('teacher.studentSubmissions')}
                </p>
                <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-foreground truncate">{assignmentArea.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    {assignmentArea.course?.name}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    {t('teacher.assignmentDetails.dueDate')}:{' '}
                    {assignmentArea.formattedDueDate || t('teacher.assignmentDetails.noDueDate')}
                  </span>
                </div>
              </div>

              <Link
                to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span>{t('teacher.actions.manageAssignment')}</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t('teacher.stats.totalSubmissions')}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t('teacher.stats.graded')}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{stats.graded}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t('teacher.stats.analyzed')}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{stats.analyzed}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t('teacher.stats.pendingReview')}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {submissions.length === 0 ? (
          <div className="flex items-center justify-center min-h-[420px]">
            <div className="w-full max-w-lg rounded-3xl border border-dashed border-border bg-card/70 p-10 text-center">
              <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {t('teacher.emptyState.noSubmissions')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('teacher.emptyState.noSubmissionsDescription')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                to={`/teacher/submissions/${submission.id}/view`}
                className="group rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                    <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(submission.student?.name || t('teacher.labels.unknownStudent'))}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {submission.student?.name || t('teacher.labels.unknownStudent')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {submission.student?.email || t('teacher.labels.noEmail')}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                    submission.status === 'GRADED'
                      ? 'bg-muted text-foreground border border-border'
                      : submission.status === 'ANALYZED'
                      ? 'bg-muted text-foreground border border-border'
                      : 'bg-muted text-foreground border border-border'
                  }`}>
                    {submission.status === 'GRADED' && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                    {submission.status === 'ANALYZED' && <Sparkles className="mr-1 h-3.5 w-3.5" />}
                    {submission.status === 'SUBMITTED' && <Hourglass className="mr-1 h-3.5 w-3.5" />}
                    {t(`status.${submission.status.toLowerCase()}`, { defaultValue: submission.status })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {t('teacher.submissionInfo.submitted')}: {submission.formattedUploadedAt}
                  </span>
                </div>

                {submission.teacherFeedback && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      <span className="text-xs font-medium text-muted-foreground">{t('teacher.feedback.teacherFeedback')}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                      {submission.teacherFeedback}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-primary">
                    {t('teacher.labels.viewDetails')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
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
