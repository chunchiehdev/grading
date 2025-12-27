/**
 * Teacher Submission History Page
 * Route: /teacher/submissions/:submissionId/history
 * 
 * Displays all version history for a student's assignment submission (teacher view)
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { useState } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionHistory } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionTimeline, type VersionTimelineItem } from '@/components/submission/VersionTimeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const { submissionId } = params;

  if (!submissionId) {
    throw new Response('Submission not found', { status: 404 });
  }

  try {
    // Get the submission to extract assignmentAreaId and studentId
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      select: {
        assignmentAreaId: true,
        studentId: true,
        student: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Response('Submission not found', { status: 404 });
    }

    // Get all versions for this assignment and student
    const history = await getSubmissionHistory(submission.assignmentAreaId, submission.studentId);

    const studentName = submission.student?.name || '學生';
    const assignmentName = history[0]?.assignmentArea?.name || '作業';
    const courseName = history[0]?.assignmentArea?.course?.name || '課程';

    return Response.json({
      submissions: history,
      studentName,
      assignmentName,
      courseName,
      totalVersions: history.length,
    });
  } catch (error) {
    console.error('Error loading submission history:', error);
    throw error;
  }
}

export default function TeacherSubmissionHistory() {
  const { submissions, studentName, assignmentName, courseName, totalVersions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  const handleCompare = (versionId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

  const handleStartComparison = () => {
    if (selectedForComparison.length === 2) {
      navigate(`/teacher/submissions/compare?versionA=${selectedForComparison[0]}&versionB=${selectedForComparison[1]}`);
    }
  };

  const versions: VersionTimelineItem[] = (submissions as any[]).map((sub: any) => ({
    id: sub.id,
    version: sub.version,
    isLatest: sub.isLatest,
    submittedAt: new Date(sub.uploadedAt),
    status: sub.status,
    finalScore: sub.finalScore,
    normalizedScore: sub.normalizedScore,
  }));

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
            返回
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
                <p className="text-sm text-gray-600 dark:text-gray-400">學生繳交記錄</p>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {assignmentName}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {courseName} • 共 {totalVersions} 個版本
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="space-y-8">
          {/* Version Timeline */}
          <VersionTimeline
            versions={versions}
            onCompare={handleCompare}
            selectedForComparison={selectedForComparison}
            viewDetailUrl={(versionId) => `/teacher/submissions/${versionId}/view`}
          />

          {/* Compare Button */}
          {selectedForComparison.length === 2 && (
            <div className="border-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-900/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                    準備比較版本
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    已選擇 2 個版本進行比較
                  </p>
                </div>
                <Button
                  onClick={handleStartComparison}
                  className="border-2 border-[#E07A5F] bg-[#E07A5F] px-6 py-3 font-sans text-sm text-[#FAF9F6] transition-all hover:bg-[#E07A5F]/90 dark:border-[#E87D3E] dark:bg-[#E87D3E]"
                >
                  開始比較
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
