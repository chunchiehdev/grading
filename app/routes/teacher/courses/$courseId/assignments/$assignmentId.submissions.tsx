import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { FileText, Calendar, Settings } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      {/* Header - Bento Style */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            {/* Title Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  {assignmentArea.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {assignmentArea.course?.name}
                </p>
              </div>
              
              <Link
                to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">設定</span>
              </Link>
            </div>

            {/* Quick Stats - Inline */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-foreground"></div>
                <span className="font-medium text-foreground">{stats.total}</span>
                <span className="text-muted-foreground">份提交</span>
              </div>
              {stats.graded > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="font-medium text-foreground">{stats.graded}</span>
                  <span className="text-muted-foreground">已評分</span>
                </div>
              )}
              {stats.analyzed > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium text-foreground">{stats.analyzed}</span>
                  <span className="text-muted-foreground">已分析</span>
                </div>
              )}
              {stats.pending > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span className="font-medium text-foreground">{stats.pending}</span>
                  <span className="text-muted-foreground">待處理</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {submissions.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('teacher.emptyState.noSubmissions')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('teacher.emptyState.noSubmissionsDescription')}
              </p>
            </div>
          </div>
        ) : (
          /* Bento Grid - Submission Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                to={`/teacher/submissions/${submission.id}/view`}
                className="group rounded-2xl bg-card border border-border p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                {/* Student Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                    <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(submission.student?.name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {submission.student?.name || 'Unknown Student'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {submission.student?.email || 'No email'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                    submission.status === 'GRADED' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : submission.status === 'ANALYZED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  }`}>
                    {submission.status === 'GRADED' && '✓ '}
                    {submission.status === 'ANALYZED' && '⚡ '}
                    {submission.status === 'SUBMITTED' && '⏳ '}
                    {t(`status.${submission.status.toLowerCase()}`, { defaultValue: submission.status })}
                  </span>
                </div>

                {/* Submission Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(submission.uploadedAt)}</span>
                </div>

                {/* Teacher Feedback Preview */}
                {submission.teacherFeedback && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      <span className="text-xs font-medium text-muted-foreground">教師回饋</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                      {submission.teacherFeedback}
                    </p>
                  </div>
                )}

                {/* Hover Indicator */}
                <div className="mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-primary">
                    查看詳細 →
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
