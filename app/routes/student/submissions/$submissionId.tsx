import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionById } from '@/services/submission.server';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Home } from 'lucide-react';
import type { GradingResultData } from '@/types/grading';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const submissionId = params.submissionId as string;
  const submission = await getSubmissionById(submissionId, student.id);
  if (!submission) {
    throw new Response('Submission not found', { status: 404 });
  }

  // Format date on server to avoid hydration mismatch
  const { formatDateForDisplay } = await import('@/lib/date.server');
  const formattedUploadedAt = formatDateForDisplay(submission.uploadedAt);

  return { student, submission: { ...submission, formattedUploadedAt } };
}

export default function StudentSubmissionDetail() {
  const { submission } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);
  const a = submission.assignmentArea;

  // Check if submission is past due date
  const isOverdue = a.dueDate ? new Date() > new Date(a.dueDate) : false;
  
  return (
    <div className="h-full w-full flex flex-col">
      {/* Desktop & Mobile unified layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {/* 頂部作業資訊 - Architectural Editorial Minimalism */}
          <div className="border-2 border-[#2B2B2B] p-4 lg:p-6 dark:border-gray-200">
            <div className="space-y-4">
              <div>
                <h1 className="mb-2 font-serif text-xl lg:text-2xl xl:text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                  {a.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{a.course.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {t('submissions:submissionDetail.submittedAt')} {submission.formattedUploadedAt}
                </p>
              </div>

              {/* 作業描述 */}
              {a.description && (
                <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {t('submissions:submissionDetail.assignmentDescription')}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.description}</p>
                </div>
              )}

              {/* 重新繳交按鈕 - 僅未評分時顯示 */}
              {submission.status !== 'GRADED' && submission.status !== 'ANALYZED' && (
                <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Link to={isOverdue ? '#' : `/student/assignments/${submission.assignmentAreaId}/submit`}>
                            <Button 
                              variant="outline" 
                              disabled={isOverdue}
                              className="w-full sm:w-auto border-2 border-[#2B2B2B] dark:border-gray-200"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              {isOverdue ? '已逾期' : t('submissions:resubmit')}
                            </Button>
                          </Link>
                        </span>
                      </TooltipTrigger>
                      {isOverdue && (
                        <TooltipContent>
                          <p>{t('submissions:submissionDetail.overdueTooltip')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>

          {/* AI分析結果 */}
          <section>
            
            <div>
              {submission.aiAnalysisResult ? (
                <GradingResultDisplay
                  result={submission.aiAnalysisResult as GradingResultData}
                  normalizedScore={submission.normalizedScore}
                  thinkingProcess={submission.thinkingProcess}
                  gradingRationale={submission.gradingRationale}
                />
              ) : (
                <div className="border-2 border-[#2B2B2B] p-12 text-center dark:border-gray-200">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('submissions:submissionDetail.aiAnalysisInProgress')}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 教師評語 */}
          {submission.teacherFeedback && (
            <section>
              <h2 className="mb-4 font-serif text-lg lg:text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                {t('submissions:submissionDetail.teacherFeedback')}
              </h2>
              <div className="border-2 border-[#2B2B2B] p-4 lg:p-6 dark:border-gray-200">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {submission.teacherFeedback}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();

  // 404 - Submission not found
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.submission"
        returnTo="/student"
      />
    );
  }

  // Generic error
  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.submission"
      returnTo="/student"
    />
  );
}

