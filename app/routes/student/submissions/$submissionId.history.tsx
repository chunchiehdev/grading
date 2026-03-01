/**
 * Student Submission History Page
 * Route: /student/submissions/:submissionId/history
 * 
 * Displays all version history for a student's assignment submission
 * with Architectural Editorial Minimalism design
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionHistory } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionTimeline, type VersionTimelineItem } from '@/components/submission/VersionTimeline';
import { Button } from '@/components/ui/button';
import { ErrorPage } from '@/components/errors/ErrorPage';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { submissionId } = params;

  // Dynamic import for server-only utilities
  const { formatRelativeTime, formatDateForDisplay } = await import('@/lib/date.server');

  if (!submissionId) {
    throw new Response('Submission not found', { status: 404 });
  }

  try {
    // Get the submission to extract assignmentAreaId
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      select: {
        assignmentAreaId: true,
        studentId: true,
      },
    });

    if (!submission) {
      throw new Response('Submission not found', { status: 404 });
    }

    // Verify student owns this submission
    if (submission.studentId !== student.id) {
      throw new Response('Unauthorized', { status: 403 });
    }

    // Get all versions for this assignment
    const history = await getSubmissionHistory(submission.assignmentAreaId, student.id);

    const assignmentName = history[0]?.assignmentArea?.name || '';
    const courseName = history[0]?.assignmentArea?.course?.name || '';

    return Response.json({
      submissions: history.map((sub: any) => ({
        id: sub.id,
        version: sub.version,
        isLatest: sub.isLatest,
        uploadedAt: sub.uploadedAt,
        submittedAtFormatted: formatRelativeTime(new Date(sub.uploadedAt)),
        submittedAtFull: formatDateForDisplay(new Date(sub.uploadedAt)),
        status: sub.status,
        statusText: sub.status,
        finalScore: sub.finalScore,
        normalizedScore: sub.normalizedScore,
        assignmentArea: sub.assignmentArea,
      })),
      assignmentName,
      courseName,
      totalVersions: history.length,
    });
  } catch (error) {
    console.error('Error loading submission history:', error);
    throw error;
  }
}

export default function StudentSubmissionHistory() {
  const { submissions, assignmentName, courseName, totalVersions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation(['submissions']);

  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  const handleCompare = (versionId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(versionId)) {
        // Deselect
        return prev.filter((id) => id !== versionId);
      } else if (prev.length < 2) {
        // Select (max 2)
        return [...prev, versionId];
      } else {
        // Replace oldest selection
        return [prev[1], versionId];
      }
    });
  };

  const handleStartComparison = () => {
    if (selectedForComparison.length === 2) {
      navigate(`/student/submissions/compare?versionA=${selectedForComparison[0]}&versionB=${selectedForComparison[1]}`);
    }
  };

  const versions: VersionTimelineItem[] = (submissions as any[]).map((sub: any) => ({
    id: sub.id,
    version: sub.version,
    isLatest: sub.isLatest,
    submittedAt: new Date(sub.uploadedAt),
    submittedAtFormatted: sub.submittedAtFormatted,
    submittedAtFull: sub.submittedAtFull,
    status: sub.status,
    statusText: sub.statusText,
    finalScore: sub.finalScore,
    normalizedScore: sub.normalizedScore,
  }));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {assignmentName || t('submissions:historyPage.fallback.assignment')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {courseName || t('submissions:historyPage.fallback.course')} •{' '}
            {t('submissions:historyPage.totalVersions', { count: totalVersions })}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl p-8">
        <div className="space-y-8">
          {/* Version Timeline */}
          <VersionTimeline
            versions={versions}
            onCompare={handleCompare}
            selectedForComparison={selectedForComparison}
            viewDetailUrl={(versionId) => `/student/submissions/${versionId}`}
          />

          {/* Compare Button - Action Zone */}
          {selectedForComparison.length === 2 && (
            <div className="border border-dashed border-[#E07A5F] bg-[#E07A5F]/5 p-6 dark:border-[#E87D3E] dark:bg-[#E87D3E]/5">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h3 className="font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                    {t('submissions:historyPage.compare.readyTitle')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('submissions:historyPage.compare.selectedHint')}
                  </p>
                </div>
                <Button
                  onClick={handleStartComparison}
                  className="border border-[#E07A5F] bg-[#E07A5F] px-6 py-3 font-sans text-sm text-white shadow-sm transition-all hover:bg-[#E07A5F]/90 hover:shadow-md dark:border-[#E87D3E] dark:bg-[#E87D3E]"
                >
                  {t('submissions:historyPage.compare.start')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.submissionHistory" returnTo="/student" />;
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <ErrorPage statusCode={403} messageKey="errors.403.viewHistory" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.submissionHistory" returnTo="/student" />;
}
