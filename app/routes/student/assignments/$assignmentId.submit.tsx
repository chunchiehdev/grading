import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { useReducer, useEffect, useRef } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission, getDraftSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useUploadStore } from '@/stores/uploadStore';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { assignmentId } = params;

  if (!assignmentId) throw new Response('Assignment not found', { status: 404 });

  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id, true);
  if (!assignment) throw new Response('Assignment not found', { status: 404 });

  // Check if student already has a submitted (non-draft) submission for this assignment
  if (assignment.submissions && assignment.submissions.length > 0) {
    const latestSubmission = assignment.submissions[0];

    // Redirect if submission is GRADED (regardless of teacher feedback)
    // This prevents students from overwriting teacher-assigned scores
    if (latestSubmission.status === 'GRADED') {
      // Already graded - redirect to view only, no resubmission allowed
      throw new Response(null, {
        status: 302,
        headers: { Location: `/student/submissions/${latestSubmission.id}` },
      });
    }

    // For SUBMITTED or ANALYZED status - allow resubmission
    // The existing submission will be updated with new file/analysis
  }

  // Check for existing draft/submission to restore state
  const draftSubmission = await getDraftSubmission(assignmentId, student.id);

  console.log('Draft Submission', draftSubmission)

  return { student, assignment, draftSubmission };
}

// Simplified state machine - Linus style: one clear data structure
interface SubmissionState {
  phase: 'upload' | 'analyze' | 'submit' | 'done';
  file: { id: string; name: string; size: number } | null;
  session: { id: string; result: any; thoughtSummary?: string } | null;
  error: string | null;
  loading: boolean;
  // Track the last submitted sessionId to prevent duplicate submissions
  lastSubmittedSessionId: string | null;
}

type Action =
  | { type: 'file_uploaded'; file: { id: string; name: string; size: number } }
  | { type: 'analysis_started'; sessionId: string }
  | { type: 'analysis_completed'; result: any; thoughtSummary?: string }
  | { type: 'submission_completed'; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'reset' };

function submissionReducer(state: SubmissionState, action: Action): SubmissionState {
  switch (action.type) {
    case 'file_uploaded':
      // New file uploaded - clear session to force re-analysis
      return { ...state, phase: 'analyze', file: action.file, session: null, error: null };
    case 'analysis_started':
      return { ...state, loading: true, session: { id: action.sessionId, result: null } };
    case 'analysis_completed':
      return { ...state, phase: 'submit', loading: false, session: { ...state.session!, result: action.result, thoughtSummary: action.thoughtSummary } };
    case 'submission_completed':
      // Store the submitted sessionId to prevent duplicate submissions
      return { ...state, phase: 'done', loading: false, lastSubmittedSessionId: action.sessionId };
    case 'error':
      return { ...state, error: action.message, loading: false };
    case 'reset':
      return { phase: 'upload', file: null, session: null, error: null, loading: false, lastSubmittedSessionId: null };
    default:
      return state;
  }
}

export default function SubmitAssignment() {
  const { t, i18n } = useTranslation(['assignment', 'grading', 'common']);
  const { assignment, draftSubmission } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Check if submission is past due date
  const isOverdue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

  // Clear upload store only if there's no draft submission to restore
  const clearFiles = useUploadStore((state) => state.clearFiles);

  useEffect(() => {
    // Only clear uploadStore if this is a fresh assignment (no existing draft)
    // This prevents showing stale upload state from other assignments
    // while preserving the ability to restore from draftSubmission
    if (!draftSubmission) {
      clearFiles();
    }
  }, [assignment.id, draftSubmission, clearFiles]);

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Single state machine - "good taste" principle
  const [state, dispatch] = useReducer(submissionReducer, {
    // Determine phase based on draft state
    phase:
      draftSubmission?.lastState === 'completed'
        ? 'submit'
        : draftSubmission?.fileMetadata
          ? 'analyze' // Has file, ready to analyze
          : 'upload', // No file, show upload
    file: draftSubmission?.fileMetadata
      ? {
          id: draftSubmission.fileMetadata.fileId,
          name: draftSubmission.fileMetadata.fileName,
          size: draftSubmission.fileMetadata.fileSize,
        }
      : null,
    // Initialize session if we have sessionId OR aiAnalysisResult
    // This handles both new submissions (with sessionId) and existing submissions (with aiAnalysisResult but no sessionId)
    session:
      draftSubmission?.sessionId || draftSubmission?.aiAnalysisResult
        ? {
            id: draftSubmission.sessionId || '',
            result: draftSubmission.aiAnalysisResult,
            thoughtSummary: draftSubmission.thoughtSummary || undefined,
          }
        : null,
    error: null,
    loading: false,
    // If status is SUBMITTED/ANALYZED/GRADED, this sessionId has been submitted
    lastSubmittedSessionId:
      draftSubmission?.status && draftSubmission.status !== 'DRAFT'
        ? draftSubmission.sessionId || null
        : null,
  });

  // GSAP animations
  useGSAP(() => {
    const tl = gsap.timeline();

    // Initial page load animation
    tl.fromTo(
      headerRef.current,
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
    ).fromTo(
      [leftPanelRef.current, rightPanelRef.current],
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: 'power2.out' },
      '-=0.4'
    );

    // Subtle entrance animations only
    gsap.from('.ai-results-title', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.5,
    });
  }, []);

  // File upload success animation
  const triggerSuccessAnimation = () => {
    if (!step1Ref.current) return;

    // Create celebration particles
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
      `;

      step1Ref.current?.appendChild(particle);

      const angle = (i * 30 * Math.PI) / 180;
      const distance = 60 + Math.random() * 40;

      gsap.fromTo(
        particle,
        { scale: 0, rotation: 0 },
        {
          scale: 1,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          rotation: 360,
          opacity: 0,
          duration: 1.2,
          ease: 'power2.out',
          onComplete: () => particle.remove(),
        }
      );
    }

    // Step animation
    gsap.to(step1Ref.current, {
      scale: 1.3,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'back.out(2)',
    });
  };

  // Simple handlers - no over-engineering
  const handleFileUpload = async (files: any[]) => {
    if (files[0]) {
      const uploadedFile = files[0];

      dispatch({
        type: 'file_uploaded',
        file: { id: uploadedFile.fileId, name: uploadedFile.fileName, size: uploadedFile.fileSize },
      });

      // Save draft submission to database for restoration
      try {
        await fetch(`/api/student/assignments/${assignment.id}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileMetadata: {
              fileId: uploadedFile.fileId,
              fileName: uploadedFile.fileName,
              fileSize: uploadedFile.fileSize,
            },
            lastState: 'uploaded',
          }),
        });
      } catch (err) {
        console.error('Failed to save draft submission:', err);
        // Non-critical error, continue anyway
      }

      // Trigger success animation
      setTimeout(triggerSuccessAnimation, 500);
    }
  };

  const pollSession = async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grading/session/${sessionId}`);
      const data = await res.json();

      if (data.success && data.data?.status === 'COMPLETED') {
        const result = data.data.gradingResults?.find((r: any) => r.result);
        if (result?.result) {
          // Extract thought summary from grading result
          const thoughtSummary = result.thoughtSummary;

          // Store both result and normalizedScore
          dispatch({
            type: 'analysis_completed',
            result: {
              ...result.result,
              _normalizedScore: result.normalizedScore, // Store normalized score with result
            },
            thoughtSummary,
          });

          // Save AI analysis result to draft
          try {
            await fetch(`/api/student/assignments/${assignment.id}/draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileMetadata: state.file
                  ? {
                      fileId: state.file.id,
                      fileName: state.file.name,
                      fileSize: state.file.size,
                    }
                  : null,
                sessionId,
                aiAnalysisResult: result.result,
                thoughtSummary,
                lastState: 'completed',
              }),
            });
          } catch (err) {
            console.error('Failed to save draft with AI result:', err);
          }

          return true;
        }
      }

      if (data.data?.status === 'FAILED') {
        dispatch({ type: 'error', message: t('grading:messages.gradingFailed') });
        return true;
      }

      return false;
    } catch {
      dispatch({ type: 'error', message: t('assignment:submit.errors.failedToCheckStatus') });
      return true;
    }
  };

  useEffect(() => {
    if (state.loading && state.session?.id) {
      const interval = setInterval(async () => {
        if (await pollSession(state.session!.id)) clearInterval(interval);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state.loading, state.session?.id]);

  const waitForParse = async (fileId: string): Promise<boolean> => {
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('/api/files?limit=100');
        const payload = await res.json();
        const file = payload?.data?.find((f: any) => f.id === fileId);
        if (file?.parseStatus === 'COMPLETED') return true;
        if (file?.parseStatus === 'FAILED') return false;
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const startAnalysis = async () => {
    if (!state.file?.id || !assignment.rubric?.id) {
      dispatch({ type: 'error', message: t('assignment:submit.errors.noFileOrRubric') });
      return;
    }

    try {
      // Wait for file parsing
      if (!(await waitForParse(state.file.id))) {
        throw new Error(t('assignment:submit.errors.parsingFailed'));
      }

      // Create grading session
      const form = new FormData();
      form.append('fileIds', JSON.stringify([state.file.id]));
      form.append('rubricIds', JSON.stringify([assignment.rubric.id]));
      // Feature 004: Pass assignmentAreaId and detected language for context-aware grading
      form.append('assignmentAreaId', assignment.id);
      form.append('language', i18n.language.startsWith('zh') ? 'zh' : 'en');

      const sessionRes = await fetch('/api/grading/session', { method: 'POST', body: form });
      const sessionData = await sessionRes.json();
      if (!sessionData.success) throw new Error(sessionData.error);

      dispatch({ type: 'analysis_started', sessionId: sessionData.data.sessionId });

      // Start grading
      const startForm = new FormData();
      startForm.append('action', 'start');
      const startRes = await fetch(`/api/grading/session/${sessionData.data.sessionId}`, {
        method: 'POST',
        body: startForm,
      });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);
    } catch (err) {
      dispatch({
        type: 'error',
        message: err instanceof Error ? err.message : t('assignment:submit.errors.failedToStartGrading'),
      });
    }
  };

  const submitFinal = async () => {
    if (!state.file?.id || !state.session?.id) {
      dispatch({ type: 'error', message: t('assignment:submit.errors.noFileUploaded') });
      return;
    }

    try {
      const res = await fetch('/api/student/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          uploadedFileId: state.file.id,
          sessionId: state.session.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.submissionId) {
        dispatch({ type: 'submission_completed', sessionId: state.session.id });
        navigate(`/student/submissions/${data.submissionId}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      dispatch({
        type: 'error',
        message: err instanceof Error ? err.message : t('assignment:submit.errors.failedToSubmit'),
      });
    }
  };

  const handleResetFile = async () => {
    // 1. Clear frontend state first
    dispatch({ type: 'reset' });

    // 2. Clear database draft (if exists)
    if (draftSubmission?.id) {
      try {
        await fetch(`/api/student/assignments/${assignment.id}/draft`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to clear draft submission:', err);
        // Non-critical error, UI already reset
      }
    }

    // 3. Clear uploadStore
    clearFiles();
  };

  // Simplified upload component without Card wrapper
  const renderUploadPhase = () => (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
      <CompactFileUpload maxFiles={1} onUploadComplete={handleFileUpload} />
    </div>
  );

  // Compute current submission status for clear state identification
  const getSubmissionStatus = () => {
    return {
      // 情況一：未上傳作業
      hasFile: !!state.file,
      // 情況二、三：是否已評分
      hasAnalysis: !!state.session?.result,
      // 情況三、四、五、六：是否有新的分析（尚未提交）
      hasNewAnalysis: state.session?.id && state.session.id !== state.lastSubmittedSessionId,
      // 情況四：已提交（包含 SUBMITTED/ANALYZED/GRADED 狀態）
      isSubmitted: !!state.lastSubmittedSessionId ||
                   (draftSubmission?.status && draftSubmission.status !== 'DRAFT'),
      // 逾期狀態
      isOverdue: isOverdue,
    };
  };

  const renderActions = () => {
    if (state.phase === 'upload') return null;

    const status = getSubmissionStatus();

    // 根據六種情況決定按鈕樣式和文字
    // 情況一：未上傳 -> 不顯示按鈕（phase === 'upload'）
    // 情況二：已上傳，未評分 -> 顯示「AI 評分分析」
    // 情況三：已上傳，已評分，未提交 -> 顯示「提交作業」+ 「重新評分」
    // 情況四：已提交（查看模式）-> 顯示「重新評分」（灰色）+ 「重新選擇檔案」
    // 情況五：已提交，想重選檔案 -> 由「重新選擇檔案」按鈕觸發重置
    // 情況六：已提交，想重新評分 -> 由「AI 評分分析」按鈕觸發

    return (
      <div className="space-y-3">
        {/* Primary Action: AI Analysis or Re-analysis */}
        {(state.phase === 'analyze' || state.phase === 'submit') && (
          <Button
            onClick={startAnalysis}
            disabled={state.loading}
            variant={status.isSubmitted && !status.hasNewAnalysis ? "outline" : "default"}
            className="w-full font-semibold py-3"
          >
            {state.loading
              ? t('grading:ai.analyzing')
              : status.isSubmitted && !status.hasNewAnalysis
                ? t('assignment:submit.regrade') // 情況四、六：已提交，顯示「重新評分」
                : t('assignment:submit.analyzeWithAI') // 情況二、三：顯示「AI 評分分析」
            }
          </Button>
        )}

        {/* Submit Assignment - Only show when there's new analysis that hasn't been submitted */}
        {state.phase === 'submit' && status.hasAnalysis && status.hasNewAnalysis && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full">
                  <Button
                    onClick={submitFinal}
                    disabled={state.loading || status.isOverdue}
                    variant="emphasis"
                    className="w-full font-semibold py-3"
                  >
                    {status.isOverdue ? t('assignment:submit.overdueCannotSubmit') : t('assignment:submit.submitAssignment')}
                  </Button>
                </span>
              </TooltipTrigger>
              {status.isOverdue && (
                <TooltipContent>
                  <p>{t('assignment:submit.overdueTooltip')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Secondary Actions */}
        <Button variant="outline" onClick={handleResetFile} className="w-full text-sm">
          {t('assignment:submit.reselectFile')}
        </Button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="bg-background">
      {/* Header */}
      <div ref={headerRef} className="border-b bg-background ">
        <div className="px-6 md:px-8 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{assignment.name}</h1>
              <p className="text-muted-foreground mt-1">
                {assignment.course.name} • {assignment.course.teacher.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - AI Results First */}
      <main className="px-0 md:px-8 lg:px-10 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
          {/* Primary: AI Grading Results */}
          <div ref={rightPanelRef} className="order-1 lg:order-1 flex flex-col">
            {state.session?.result ? (
              <GradingResultDisplay
                result={state.session.result}
                normalizedScore={state.session.result._normalizedScore}
                thoughtSummary={state.session.thoughtSummary}
                isLoading={state.loading}
              />
            ) : (
              <GradingResultDisplay isLoading={state.loading} />
            )}
          </div>

          {/* Secondary: Upload & Actions */}
          <div ref={leftPanelRef} className="order-2 lg:order-2 flex flex-col">
            <div className="space-y-6 px-4 py-6 md:p-6">
              {/* Compact Upload Section */}
              {state.phase === 'upload' ? (
                renderUploadPhase()
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-lg font-bold">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 truncate">{state.file?.name}</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {Math.round((state.file?.size || 0) / 1024)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Actions */}
              {renderActions()}

              {/* Error Display */}
              {state.error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{state.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
