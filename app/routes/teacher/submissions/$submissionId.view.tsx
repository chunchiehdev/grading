import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, useParams, Form } from 'react-router';
import { ClientOnly } from '@/components/ui/client-only';
import { useState, useEffect } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionByIdForTeacher } from '@/services/submission.server';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { PDFViewerWithNavigation } from '@/components/pdf/PDFViewerWithNavigation';
import {
  StudentInfoCompact,
  AssignmentInfoCompact,
  ScoreBadge,
} from '@/components/grading/CompactInfoComponents';
import { useTranslation } from 'react-i18next';
import type { TeacherInfo, TeacherSubmissionView } from '@/types/teacher';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, MessageSquare } from 'lucide-react';


interface LoaderData {
  teacher: TeacherInfo;
  submission: TeacherSubmissionView;
}


interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId as string;

  if (!submissionId) {
    throw new Response('Submission ID is required', { status: 400 });
  }

  const rawSubmission = await getSubmissionByIdForTeacher(submissionId, teacher.id);

  if (!rawSubmission) {
    throw new Response('Submission not found', { status: 404 });
  }

  // Import date formatting utilities
  const { formatDateForDisplay } = await import('@/lib/date.server');

  // Transform database structure into display-optimized structure
  const submission: TeacherSubmissionView = {
    student: {
      name: rawSubmission.student?.name ?? 'Unknown Student',
      email: rawSubmission.student?.email ?? 'No email',
      picture: rawSubmission.student?.picture ?? null,
      initial: rawSubmission.student?.name?.[0] ?? 'U',
    },
    assignment: {
      id: rawSubmission.assignmentArea.id,
      name: rawSubmission.assignmentArea.name,
      description: rawSubmission.assignmentArea.description,
      dueDate: rawSubmission.assignmentArea.dueDate?.toISOString() ?? null,
      formattedDueDate: rawSubmission.assignmentArea.dueDate
        ? formatDateForDisplay(rawSubmission.assignmentArea.dueDate)
        : null,
      course: {
        id: rawSubmission.assignmentArea.course.id,
        name: rawSubmission.assignmentArea.course.name,
      },
    },
    grading: {
      finalScore: rawSubmission.finalScore,
      normalizedScore: rawSubmission.normalizedScore,
      uploadedAt: rawSubmission.uploadedAt.toISOString(),
      formattedUploadedAt: formatDateForDisplay(rawSubmission.uploadedAt),
      filePath: rawSubmission.filePath,
      teacherFeedback: rawSubmission.teacherFeedback,
      aiAnalysisResult: rawSubmission.aiAnalysisResult,
      usedContext: rawSubmission.usedContext ?? null, // Feature 004
      thinkingProcess: rawSubmission.thinkingProcess ?? null, // Feature 012: AI thinking process
      thoughtSummary: rawSubmission.thoughtSummary ?? null, // Legacy field for compatibility
      gradingRationale: rawSubmission.gradingRationale ?? null, // Feature 012: AI grading rationale
    },
    navigation: {
      backUrl: `/teacher/courses/${rawSubmission.assignmentArea.course.id}/assignments/${rawSubmission.assignmentArea.id}/submissions`,
    },
  };

  return { teacher, submission };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId as string;
  const formData = await request.formData();
  const teacherFeedback = formData.get('teacherFeedback') as string;

  try {
    // Import the update function
    const { updateSubmission } = await import('@/services/submission.server');

    // Verify teacher has permission to update this submission
    const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
    if (!submission) {
      return { success: false, error: 'Submission not found or unauthorized' };
    }

    // Update the submission with teacher feedback
    await updateSubmission(submissionId, {
      teacherFeedback: teacherFeedback || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating teacher feedback:', error);
    return { success: false, error: 'Failed to save feedback' };
  }
}

export default function TeacherSubmissionView() {
  const { submission } = useLoaderData<typeof loader>();
  const params = useParams();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('teacher');

  // Local state for teacher feedback
  const [feedback, setFeedback] = useState(submission.grading.teacherFeedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset submitting state when action completes
  useEffect(() => {
    if (actionData) {
      setIsSubmitting(false);
    }
  }, [actionData]);

  // Full screen layout - bypasses parent container constraints
  return (
    <div className="fixed inset-0 top-[60px] bg-background flex flex-col">
      {/* Top Info Bar - Responsive */}
      <div className=" border-b  backdrop-blur-sm shrink-0 z-10">
        <div className="px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-between gap-2 lg:gap-6">
          {/* Left: Student + Assignment */}
          <div className="flex items-center gap-2 lg:gap-6">
            <StudentInfoCompact student={submission.student} />
            <div className="h-6 w-px bg-border hidden lg:block" />
            <div className="hidden lg:block">
              <AssignmentInfoCompact assignment={submission.assignment} />
            </div>
          </div>
          
          {/* Right: History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/teacher/submissions/${params.submissionId}/history`}
            className="text-xs lg:text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4">
              <path d="M3 3v5h5"/>
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
              <path d="M12 7v5l4 2"/>
            </svg>
            歷史記錄
          </Button>
        </div>
      </div>

      {/* Main Content: PDF + Sidebar - Responsive Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        {/* Left: PDF Viewer */}
        {/* Mobile: full width, Desktop: 70% */}
        <div 
          className="w-full lg:w-[50%] border-r-0 lg:border-r overflow-hidden flex flex-col h-[50vh] lg:h-auto bg-muted/10 hide-scrollbar"
        >
          {submission.grading.filePath ? (
            <ClientOnly
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">載入 PDF 檢視器...</span>
                  </div>
                </div>
              }
            >
              <PDFViewerWithNavigation
                fileUrl={`/api/files/${submission.grading.filePath}/download`}
                fileName={`${submission.student.name}-${submission.assignment.name}.pdf`}
              />
            </ClientOnly>
          ) : ( 
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">沒有上傳檔案</p>
            </div>
          )}
        </div>

        {/* Right: Grading Sidebar */}
        {/* Mobile: full width, Desktop: 30% */}
        <aside 
          className="w-full lg:w-[50%] overflow-y-auto flex-1 lg:flex-initial bg-background hide-scrollbar"
        >
          <div className="p-6 space-y-6">
            {/* AI Analysis Details */}
            {submission.grading.aiAnalysisResult && (
              <GradingResultDisplay
                result={submission.grading.aiAnalysisResult}
                normalizedScore={submission.grading.normalizedScore}
                thinkingProcess={submission.grading.thinkingProcess}
                thoughtSummary={submission.grading.thoughtSummary}
                gradingRationale={submission.grading.gradingRationale}
              />
            )}

            {/* Teacher Feedback Section */}
            <div className="border-t pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">教師回饋</h3>
                </div>

                {/* Success/Error Messages */}
                {actionData?.success && (
                  <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      回饋已成功保存
                    </AlertDescription>
                  </Alert>
                )}

                {actionData?.error && (
                  <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      {actionData.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Feedback Form */}
                <Form method="post" onSubmit={() => setIsSubmitting(true)}>
                  <div className="space-y-3">
                    <Label htmlFor="teacherFeedback" className="text-sm text-muted-foreground">
                      給學生的評語與建議
                    </Label>
                    <Textarea
                      id="teacherFeedback"
                      name="teacherFeedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="請輸入您對這份作業的評語、建議或需要改進的地方..."
                      className="min-h-[120px] resize-none"
                    />
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? '保存中...' : '保存回饋'}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
