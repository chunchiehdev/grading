/**
 * Teacher Submission History Page
 * Route: /teacher/submissions/:submissionId/history
 * 
 * Displays all version history for a student's assignment submission (teacher view)
 */

import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { useState } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionHistory } from '@/services/version-management.server';
import { db } from '@/types/database';
import { VersionTimeline, type VersionTimelineItem } from '@/components/submission/VersionTimeline';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface HistoryLoaderData {
  submissions: any[];
  studentInfo: {
    id: string;
    name: string;
    email: string;
    picture: string;
  };
  assignmentName: string;
  courseName: string;
  totalVersions: number;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<HistoryLoaderData> {
  const teacher = await requireTeacher(request);
  const { submissionId } = params;

  // Dynamic import for server-only utilities
  const { formatRelativeTime, formatDateForDisplay } = await import('@/lib/date.server');

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
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Response('Submission not found', { status: 404 });
    }

    // Get all versions for this assignment and student
    const history = await getSubmissionHistory(submission.assignmentAreaId, submission.studentId);

    const studentInfo = {
      id: submission.student?.id || '',
      name: submission.student?.name || '學生',
      email: submission.student?.email || '',
      picture: submission.student?.picture || '',
    };
    const assignmentName = history[0]?.assignmentArea?.name || '作業';
    const courseName = history[0]?.assignmentArea?.course?.name || '課程';

    // Helper function for status text
    function getStatusText(status: string) {
      const statusMap: Record<string, string> = {
        SUBMITTED: '已提交',
        ANALYZED: '分析完成',
        GRADED: '已評分',
        DRAFT: '草稿',
      };
      return statusMap[status] || status;
    }

    return {
      submissions: history.map((sub: any) => ({
        id: sub.id,
        version: sub.version,
        isLatest: sub.isLatest,
        uploadedAt: sub.uploadedAt,
        submittedAtFormatted: formatRelativeTime(new Date(sub.uploadedAt)),
        submittedAtFull: formatDateForDisplay(new Date(sub.uploadedAt)),
        status: sub.status,
        statusText: getStatusText(sub.status),
        finalScore: sub.finalScore,
        normalizedScore: sub.normalizedScore,
        assignmentArea: sub.assignmentArea,
        student: sub.student,
      })),
      studentInfo,
      assignmentName,
      courseName,
      totalVersions: history.length,
    };
  } catch (error) {
    console.error('Error loading submission history:', error);
    throw error;
  }
}

export default function TeacherSubmissionHistory() {
  const { submissions, studentInfo, assignmentName, courseName, totalVersions } = useLoaderData<HistoryLoaderData>();
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
    submittedAtFormatted: sub.submittedAtFormatted,
    submittedAtFull: sub.submittedAtFull,
    status: sub.status,
    statusText: sub.statusText,
    finalScore: sub.finalScore,
    normalizedScore: sub.normalizedScore,
  }));

  const studentDisplayName = studentInfo?.name || '學生';
  const studentInitial = studentDisplayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Student Info Card */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={studentInfo?.picture || undefined} alt={studentDisplayName} />
                <AvatarFallback className="bg-muted text-foreground">{studentInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                  {studentDisplayName}
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{studentInfo?.email || '無電子郵件'}</p>
                <p className="mt-1 text-xs text-muted-foreground">學生繳交記錄</p>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {assignmentName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {courseName} • 共 {totalVersions} 個版本
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
            viewDetailUrl={(versionId) => `/teacher/submissions/${versionId}/view`}
          />

          {/* Compare Button - Action Zone */}
          {selectedForComparison.length === 2 && (
            <div className="border border-dashed border-[#E07A5F] bg-[#E07A5F]/5 p-6 dark:border-[#E87D3E] dark:bg-[#E87D3E]/5">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h3 className="font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                    準備比較版本
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    已選擇 2 個版本進行比較
                  </p>
                </div>
                <Button
                  onClick={handleStartComparison}
                  className="border border-[#E07A5F] bg-[#E07A5F] px-6 py-3 font-sans text-sm text-white shadow-sm transition-all hover:bg-[#E07A5F]/90 hover:shadow-md dark:border-[#E87D3E] dark:bg-[#E87D3E]"
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

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation(['common']);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              404
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              找不到此提交記錄或歷史版本不存在
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            返回首頁
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
            錯誤
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            載入提交歷史時發生錯誤，請稍後再試
          </p>
        </div>
        <Link
          to="/teacher"
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          返回首頁
        </Link>
      </div>
    </div>
  );
}
