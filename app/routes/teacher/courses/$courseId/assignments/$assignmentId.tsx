import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import {
  Calendar,
  FileText,
  Users,
  AlertCircle,
  Edit,
  Paperclip,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import { getAssignmentAreaById, type AssignmentAreaInfo } from '@/services/assignment-area.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorPage } from '@/components/errors/ErrorPage';

interface Attachment {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  assignmentArea: AssignmentAreaInfo;
  courseId: string;
  formattedDueDate?: string;
  attachments: Attachment[];
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;

  if (!courseId || !assignmentId) {
    throw new Response('Course ID and Assignment ID are required', { status: 400 });
  }

  const assignmentArea = await getAssignmentAreaById(assignmentId, teacher.id);

  if (!assignmentArea) {
    throw new Response('Assignment not found', { status: 404 });
  }

  const { formatDateForDisplay } = await import('@/lib/date.server');
  const formattedDueDate = assignmentArea.dueDate
    ? formatDateForDisplay(new Date(assignmentArea.dueDate))
    : undefined;

  // Load attachments
  let attachments: Attachment[] = [];
  if (assignmentArea.referenceFileIds) {
    try {
      const fileIds = JSON.parse(assignmentArea.referenceFileIds);
      if (fileIds && fileIds.length > 0) {
        const { db } = await import('@/lib/db.server');
        const files = await db.uploadedFile.findMany({
          where: {
            id: { in: fileIds },
            isDeleted: false,
          },
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
          },
        });
        attachments = files.map((file) => ({
          fileId: file.id,
          fileName: file.originalFileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        }));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  }

  return {
    teacher,
    assignmentArea,
    courseId,
    formattedDueDate,
    attachments,
  };
}

/* ------------------------------------------------------------------ */
/*  Small helper components                                            */
/* ------------------------------------------------------------------ */

/** File-type badge icon (PDF = red, Word = blue, default = neutral) */
function FileTypeIcon({ mimeType, fileName }: { mimeType: string; fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
  const isWord =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc';

  if (isPdf) {
    return (
      <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-red-600 dark:text-red-400">PDF</span>
      </div>
    );
  }

  if (isWord) {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">W</span>
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
      <FileText className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AssignmentDetail() {
  const { assignmentArea, courseId, formattedDueDate, attachments } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation(['course', 'common']);

  const submissionCount = assignmentArea._count?.submissions ?? 0;
  const groupLabel = assignmentArea.class
    ? assignmentArea.class.name
    : t('course:assignment.detail.allStudents');

  const isDueSoon =
    assignmentArea.dueDate && new Date(assignmentArea.dueDate) > new Date();

  return (
    <div className="bg-background pb-10">
      {/* ── Compact title bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
            {assignmentArea.name}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild variant="outline" size="default">
              <Link
                to={`/teacher/courses/${courseId}/assignments/${assignmentArea.id}/manage`}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('course:assignment.detail.edit')}
              </Link>
            </Button>
            <Button asChild variant="default" size="default">
              <Link
                to={`/teacher/courses/${courseId}/assignments/${assignmentArea.id}/submissions`}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('course:assignment.detail.viewSubmissions')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ─── Description (large card, 2 cols) ─── */}
          {assignmentArea.description && (
            <Card className="md:col-span-2 rounded-xl hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {t('course:assignment.detail.description')}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {assignmentArea.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ─── Due Date (tile) ─── */}
          <Card className="rounded-xl hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('course:assignment.detail.dueDate')}
                </h2>
              </div>

              {formattedDueDate ? (
                <div>
                  <p className="text-xl font-bold text-foreground">{formattedDueDate}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isDueSoon
                      ? t('course:assignment.detail.upcoming')
                      : t('course:assignment.detail.overdue')}
                  </p>
                </div>
              ) : (
                <p className="text-base font-medium text-muted-foreground">
                  {t('course:assignment.detail.noDueDate')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ─── Attachments (medium card, 2 cols) ─── */}
          {attachments.length > 0 && (
            <Card className="md:col-span-2 rounded-xl hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {t('course:assignment.detail.referenceAttachments')}
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {attachments.map((file) => (
                    <a
                      key={file.fileId}
                      href={`/api/files/${file.fileId}/download`}
                      download={file.fileName}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} />
                      <span className="flex-1 truncate text-foreground">{file.fileName}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Rubric (tile) ─── */}
          <Card className="rounded-xl hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('course:assignment.detail.rubric')}
                </h2>
              </div>

              {assignmentArea.rubric ? (
                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                    {assignmentArea.rubric.name}
                  </p>
                  <Link
                    to={`/teacher/rubrics/${assignmentArea.rubric.id}`}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {t('course:assignment.detail.viewRubric')}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">{t('course:assignment.detail.noRubric')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Group Setting (tile) ─── */}
          <Card className="rounded-xl hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('course:assignment.detail.groupSetting')}
                </h2>
              </div>
              <p className="text-base font-medium text-foreground">{groupLabel}</p>
            </CardContent>
          </Card>

          {/* ─── Submissions (tile) ─── */}
          <Card className="rounded-xl hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('course:assignment.detail.submissions')}
                </h2>
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {submissionCount}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return (
      <ErrorPage statusCode={400} messageKey="errors.400.missingParams" returnTo="/teacher" />
    );
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage statusCode={404} messageKey="errors.404.assignment" returnTo="/teacher" />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.assignment"
      returnTo="/teacher"
    />
  );
}
