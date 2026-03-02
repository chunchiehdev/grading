import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, useParams, Form, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, MessageSquare, Trash2, Home } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';


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
  const navigate = useNavigate();
  const { t } = useTranslation('teacher');

  // Local state for teacher feedback
  const [feedback, setFeedback] = useState(submission.grading.teacherFeedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf'); // Mobile tab navigation
  
  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset submitting state when action completes
  useEffect(() => {
    if (actionData) {
      setIsSubmitting(false);
    }
  }, [actionData]);

  // Handle deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${params.submissionId}/delete`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t('teacher:submissionView.deleteSuccess'));
        // Navigate back to assignment submissions list
        navigate(submission.navigation.backUrl);
      } else {
        toast.error(data.error || t('teacher:submissionView.deleteFailed'));
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error(t('teacher:submissionView.deleteFailed'));
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Full screen layout - bypasses parent container constraints
  return (
    <div className="fixed inset-0 top-[60px] bg-background flex flex-col">
      {/* Top Info Bar - Responsive */}
      <div className=" border-b  backdrop-blur-sm shrink-0 z-10">
        <div className="px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-between gap-2 lg:gap-6">
          {/* Left: Student + Assignment (Mobile) / Empty Spacer (Desktop) */}
          <div className="flex items-center gap-2 lg:gap-6">
            <div className="lg:hidden">
              <StudentInfoCompact student={submission.student} />
            </div>
            {/* Desktop: Empty spacer to balance the layout */}
            <div className="hidden lg:block lg:w-32"></div>
          </div>
          
          {/* Center: Student Info (Desktop only) */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            <StudentInfoCompact student={submission.student} />
            <div className="h-6 w-px bg-border" />
            <AssignmentInfoCompact assignment={submission.assignment} />
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs lg:text-sm"
            >
              <Trash2 className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
              刪除
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: Split Panel Layout (lg and above) */}
      <div className="hidden lg:flex flex-row flex-1 overflow-hidden min-h-0">
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
                studentName={submission.student.name}
                studentPicture={submission.student.picture}
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

      {/* Mobile: Tab Navigation (below lg) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:hidden flex flex-col flex-1 overflow-hidden">
        <div className="shrink-0 bg-background">
          <TabsList className="w-full h-12 bg-transparent border-0 rounded-none p-0 grid grid-cols-2">
            <TabsTrigger
              value="pdf"
              className="rounded-none border-0 text-xs sm:text-sm text-muted-foreground data-[state=active]:text-[#E07A5F] data-[state=active]:font-semibold data-[state=active]:bg-[#E07A5F]/15 data-[state=active]:shadow-none"
            >
              PDF
            </TabsTrigger>
            <TabsTrigger
              value="grading"
              className="rounded-none border-0 text-xs sm:text-sm text-muted-foreground data-[state=active]:text-[#E07A5F] data-[state=active]:font-semibold data-[state=active]:bg-[#E07A5F]/15 data-[state=active]:shadow-none"
            >
              評分結果
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="pdf" className="flex-1 overflow-hidden m-0 p-0">
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
        </TabsContent>

        <TabsContent value="grading" className="flex-1 overflow-y-auto m-0 p-4">
          <div className="space-y-6">
            {/* AI Analysis Details */}
            {submission.grading.aiAnalysisResult && (
              <GradingResultDisplay
                result={submission.grading.aiAnalysisResult}
                normalizedScore={submission.grading.normalizedScore}
                thinkingProcess={submission.grading.thinkingProcess}
                thoughtSummary={submission.grading.thoughtSummary}
                gradingRationale={submission.grading.gradingRationale}
                studentName={submission.student.name}
                studentPicture={submission.student.picture}
              />
            )}

            {/* Teacher Feedback Section */}
            <div className="border-t pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">教師回饋</h3>
                </div>

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

                <Form method="post" onSubmit={() => setIsSubmitting(true)}>
                  <div className="space-y-3">
                    <Label htmlFor="teacherFeedback-mobile" className="text-sm text-muted-foreground">
                      給學生的評語與建議
                    </Label>
                    <Textarea
                      id="teacherFeedback-mobile"
                      name="teacherFeedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="請輸入您對這份作業的評語、建議或需要改進的地方..."
                      className="min-h-[120px] resize-none"
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? '保存中...' : '保存回饋'}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除提交</DialogTitle>
            <DialogDescription>
              您確定要刪除這份提交嗎？此操作將永久刪除提交記錄和相關 PDF 文件，無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Error Boundary for handling loader errors (404, etc.)
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
              找不到此提交記錄，可能已被刪除或不存在
            </p>
          </div>
          <a
            href="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            返回首頁
          </a>
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
            載入提交時發生錯誤，請稍後再試
          </p>
        </div>
        <a
          href="/teacher"
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          返回首頁
        </a>
      </div>
    </div>
  );
}
