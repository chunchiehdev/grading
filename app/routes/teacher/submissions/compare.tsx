/**
 * Teacher Version Comparison Page
 * Route: /teacher/submissions/compare?versionA=:id&versionB=:id
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { compareSubmissionVersions } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionComparison } from '@/components/submission/VersionComparison';
import { ArrowLeft, User, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export async function loader({ request }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const url = new URL(request.url);
  const versionAId = url.searchParams.get('versionA');
  const versionBId = url.searchParams.get('versionB');

  if (!versionAId || !versionBId) {
    throw new Response('Both version IDs required', { status: 400 });
  }

  try {
    // Verify teacher has access to these submissions
    const submissionA = await db.submission.findUnique({
      where: { id: versionAId },
      select: {
        assignmentArea: {
          select: {
            course: {
              select: {
                teacherId: true,
              },
            },
          },
        },
      },
     });

    if (!submissionA) {
      throw new Response('Submission not found', { status: 404 });
    }

    if (submissionA.assignmentArea.course.teacherId !== teacher.id) {
      throw new Response('Unauthorized', { status: 403 });
    }

    // Perform comparison
    const comparison = await compareSubmissionVersions(versionAId, versionBId);

    if (!comparison) {
      throw new Response('Failed to compare versions', { status: 500 });
    }

    const studentName = comparison.versionA.submission.student?.name || '';
    const assignmentName = comparison.versionA.submission.assignmentArea?.name || '';

    return Response.json({
      comparison,
      studentName,
      assignmentName,
    });
  } catch (error) {
    console.error('Error loading comparison:', error);
    throw error;
  }
}

export default function TeacherVersionCompare() {
  const { comparison, studentName, assignmentName } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation(['submissions']);

  const studentDisplayName = studentName || t('submissions:historyPage.fallback.student');
  const assignmentDisplayName = assignmentName || t('submissions:historyPage.fallback.assignment');

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
            {t('submissions:historyCompare.backToHistory')}
          </button>

          {/* Student Info Card */}
          <div className="mb-6 border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-[#2B2B2B] dark:border-gray-200">
                <User className="h-5 w-5 text-[#2B2B2B] dark:text-gray-200" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                  {studentDisplayName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('submissions:historyCompare.studentComparison')}</p>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {assignmentDisplayName}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('submissions:historyCompare.analysisTitle')}</p>
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
  const { t } = useTranslation(['common']);

  if (isRouteErrorResponse(error) && error.status === 400) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              400
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('common:errors.400.missingVersionParams')}
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            {t('common:returnHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              404
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('common:errors.404.submissionVersion')}
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            {t('common:returnHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              403
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('common:errors.403.compareVersions')}
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            {t('common:returnHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 500) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              500
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('common:errors.500.compareVersions')}
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            {t('common:returnHome')}
          </Link>
        </div>
      </div>
    );
  }

  // Handle other errors
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {t('common:errors.generic.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('common:errors.generic.comparison')}
          </p>
        </div>
        <Link
          to="/teacher"
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          {t('common:returnHome')}
        </Link>
      </div>
    </div>
  );
}
