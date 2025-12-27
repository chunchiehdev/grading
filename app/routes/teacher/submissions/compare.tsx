/**
 * Teacher Version Comparison Page
 * Route: /teacher/submissions/compare?versionA=:id&versionB=:id
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { compareSubmissionVersions } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionComparison } from '@/components/submission/VersionComparison';
import { ArrowLeft, User } from 'lucide-react';

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

    const studentName = comparison.versionA.submission.student?.name || '學生';
    const assignmentName = comparison.versionA.submission.assignmentArea?.name || '作業';

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

          {/* Student Info Card */}
          <div className="mb-6 border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-[#2B2B2B] dark:border-gray-200">
                <User className="h-5 w-5 text-[#2B2B2B] dark:text-gray-200" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                  {studentName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">學生版本比較</p>
              </div>
            </div>
          </div>

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
