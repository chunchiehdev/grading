/**
 * Student Version Comparison Page  
 * Route: /student/submissions/compare?versionA=:id&versionB=:id
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { compareSubmissionVersions } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionComparison } from '@/components/submission/VersionComparison';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { ArrowLeft, User } from 'lucide-react';

export async function loader({ request }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const url = new URL(request.url);
  const versionAId = url.searchParams.get('versionA');
  const versionBId = url.searchParams.get('versionB');

  if (!versionAId || !versionBId) {
    throw new Response('Both version IDs required', { status: 400 });
  }

  try {
    // Verify student owns both submissions
    const [submissionA, submissionB] = await Promise.all([
      db.submission.findUnique({
        where: { id: versionAId },
        select: { studentId: true },
      }),
      db.submission.findUnique({
        where: { id: versionBId },
        select: { studentId: true },
      }),
    ]);

    if (!submissionA || !submissionB) {
      throw new Response('One or both submissions not found', { status: 404 });
    }

    if (submissionA.studentId !== student.id || submissionB.studentId !== student.id) {
      throw new Response('Unauthorized', { status: 403 });
    }

    // Perform comparison
    const comparison = await compareSubmissionVersions(versionAId, versionBId);

    if (!comparison) {
      throw new Response('Failed to compare versions', { status: 500 });
    }

    const assignmentName = comparison.versionA.submission.assignmentArea?.name || '作業';

    return Response.json({
      comparison,
      assignmentName,
    });
  } catch (error) {
    console.error('Error loading comparison:', error);
    throw error;
  }
}

export default function StudentVersionCompare() {
  const { comparison, assignmentName } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-gray-950">
      {/* Header */}
      <div className="border-b-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-[#E07A5F] dark:text-gray-400 dark:hover:text-[#E87D3E]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回歷史記錄
          </button>

          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {assignmentName}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">版本比較分析</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl p-6">
        <VersionComparison comparison={comparison} />
      </div>
    </div>
  );
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return <ErrorPage statusCode={400} messageKey="errors.400.missingVersionParams" returnTo="/student" />;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.submissionVersion" returnTo="/student" />;
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <ErrorPage statusCode={403} messageKey="errors.403.compareVersions" returnTo="/student" />;
  }

  if (isRouteErrorResponse(error) && error.status === 500) {
    return <ErrorPage statusCode={500} messageKey="errors.500.compareVersions" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.comparison" returnTo="/student" />;
}
