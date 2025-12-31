import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
import React, { useReducer, useEffect, useRef } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission, getDraftSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { ClientOnly } from '@/components/ui/client-only';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useUploadStore } from '@/stores/uploadStore';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { dbCriteriaToUICategories, calculateRubricStats } from '@/utils/rubric-transform';

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

  // Format dates on server to avoid hydration mismatch
  const { formatDateForDisplay } = await import('@/lib/date.server');
  const formattedDueDate = assignment.dueDate ? formatDateForDisplay(assignment.dueDate) : null;

  return { student, assignment: { ...assignment, formattedDueDate }, draftSubmission };
}

// Simplified state machine - Linus style: one clear data structure
interface SubmissionState {
  phase: 'upload' | 'analyze' | 'submit' | 'done';
  file: { id: string; name: string; size: number } | null;
  session: { 
    id: string; 
    result: any; 
    thoughtSummary?: string;
    thinkingProcess?: string; // Feature 012
    gradingRationale?: string; // Feature 012
  } | null;
  error: string | null;
  loading: boolean;
  // Track the last submitted sessionId to prevent duplicate submissions
  lastSubmittedSessionId: string | null;
}

type Action =
  | { type: 'file_uploaded'; file: { id: string; name: string; size: number } }
  | { type: 'analysis_started'; sessionId: string }
  | { type: 'analysis_completed'; result: any; thoughtSummary?: string; thinkingProcess?: string; gradingRationale?: string }
  | { type: 'submission_completed'; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'reset' }
  | { type: 'thought_update'; thought: string };

function submissionReducer(state: SubmissionState, action: Action): SubmissionState {
  switch (action.type) {
    case 'file_uploaded':
      // New file uploaded - clear session to force re-analysis
      return { ...state, phase: 'analyze', file: action.file, session: null, error: null };
    case 'analysis_started':
      return { ...state, loading: true, session: { id: action.sessionId, result: null } };
    case 'analysis_completed':
      return { 
        ...state, 
        phase: 'submit', 
        loading: false, 
        session: { 
          ...state.session!, 
          result: action.result, 
          thoughtSummary: action.thoughtSummary,
          thinkingProcess: action.thinkingProcess,
          gradingRationale: action.gradingRationale
        } 
      };
    case 'submission_completed':
      // Store the submitted sessionId to prevent duplicate submissions
      return { ...state, phase: 'done', loading: false, lastSubmittedSessionId: action.sessionId };
    case 'error':
      return { ...state, error: action.message, loading: false };
    case 'reset':
      return { phase: 'upload', file: null, session: null, error: null, loading: false, lastSubmittedSessionId: null };
    case 'thought_update':
      if (!state.session) return state;
      // Only update if there's actual new content (avoid overwriting with empty strings)
      if (!action.thought || action.thought.length === 0) return state;
      
      // Use the new thought directly (useChat already accumulates for us)
      return {
        ...state,
        session: {
          ...state.session,
          thinkingProcess: action.thought,
        },
      };
    default:
      return state;
  }
}

export default function SubmitAssignment() {
  const { t, i18n } = useTranslation(['assignment', 'grading', 'common']);
  const { student, assignment, draftSubmission } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [useDirectGrading, setUseDirectGrading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('info'); // Mobile tab navigation

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
            thinkingProcess: draftSubmission.thinkingProcess || undefined,
            gradingRationale: draftSubmission.gradingRationale || undefined,
          }
        : null,
    error: null,
    loading: !!draftSubmission?.sessionId && draftSubmission?.lastState !== 'completed',
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
          const thinkingProcess = result.thinkingProcess; // Feature 012
          const gradingRationale = result.gradingRationale; // Feature 012

          // Store both result and normalizedScore
          dispatch({
            type: 'analysis_completed',
            result: {
              ...result.result,
              _normalizedScore: result.normalizedScore, // Store normalized score with result
            },
            thoughtSummary,
            thinkingProcess,
            gradingRationale,
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
                thinkingProcess, // Feature 012
                gradingRationale, // Feature 012
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

  // AI SDK UI Hook for Streaming Bridge
  const { messages, sendMessage, isLoading: isChatLoading } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/grading/bridge',
    }),
    onFinish: (message) => {
      // When streaming finishes, we can trigger a final poll or update state
      // console.log('[Frontend] Streaming finished:', message);
    },
    onError: (error) => {
      console.error('[Frontend] Streaming error:', error);
      dispatch({ type: 'error', message: 'Streaming connection failed' });
    }
  }) as any;

  // Sync streaming messages to local state for display
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // console.log('[Frontend] Received message update:', lastMessage);
      
      if (lastMessage.role === 'assistant') {
        // Update thought stream
        // Strictly prioritize 'parts' to separate text from tool calls
        let thought = '';
        const parts = (lastMessage as any).parts;

        if (parts && Array.isArray(parts)) {
          // Only extract text parts, ignoring tool-invocations
          thought = parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
        } else {
          // Fallback only if parts structure is missing
          thought = lastMessage.content || '';
        }

        // Clean up thought content: remove raw tool call logs if they leaked into text
        // This regex looks for patterns like "Calling tool X with arguments: {...}"
        thought = thought.replace(/Calling tool \w+ with arguments: \{[\s\S]*?\}/g, '');
        thought = thought.replace(/tool_code[\s\S]*?```/g, ''); // Remove code blocks that might be tool calls
        
        // console.log('[Frontend] Extracted thought:', thought.substring(0, 50) + '...');
        dispatch({ type: 'thought_update', thought });
      }
    }
  }, [messages]);

  // Trigger streaming when session starts
  useEffect(() => {
    if (state.loading && state.session?.id && !isChatLoading && messages.length === 0) {
      // console.log('Starting streaming bridge for session:', state.session.id);
      
      // Trigger the bridge API
      sendMessage({ 
        role: 'user', 
        content: 'Start grading stream',
      }, {
        body: {
          data: {
            resultId: state.session.result?.id || '', // Use result.id from session state
            userId: student.id,
            sessionId: state.session.id,
            useDirectGrading: useDirectGrading,
          }
        }
      });
    }
  }, [state.loading, state.session?.id, isChatLoading, messages.length, student.id, useDirectGrading, state.session?.result?.id]);

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

      // Save draft with sessionId to enable auto-resume
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
            sessionId: sessionData.data.sessionId,
            lastState: 'analyzing',
          }),
        });
      } catch (err) {
        console.error('Failed to save draft with session ID:', err);
      }

      // Start grading
      const startForm = new FormData();
      startForm.append('action', 'start');
      startForm.append('useDirectGrading', String(useDirectGrading));
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

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col">
      {/* Desktop: Split Panel Layout (lg and above) */}
      <div className="hidden lg:flex flex-row flex-1 overflow-hidden min-h-0">
        {/* Left Column: Assignment Cards - Scrollable */}
        <div ref={leftPanelRef} className="w-full lg:w-1/2 overflow-y-auto border-r-0 lg:border-r hide-scrollbar">
          <div className="space-y-8 p-4 sm:px-6 lg:px-8 py-8">
            {/* Assignment Header Card */}
            <div className="group relative border-2 border-[#2B2B2B] p-6 transition-all hover:shadow-md dark:border-gray-200">
              <div className="pointer-events-none absolute inset-0 border-2 border-[#2B2B2B]/20 dark:border-gray-200/20" />
              <div className="relative">
                <h1 className="mb-3 font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                  {assignment.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{assignment.course.name}</span>
                  <span>·</span>
                  <span>{t('assignment:submit.teacher', '授課教師')}:</span>
                  <span>{assignment.course.teacher.name || assignment.course.teacher.email}</span>
                </div>
              </div>
            </div>

            {/* Assignment Description Card */}
            {assignment.description && (
              <div className="group relative border-2 border-[#2B2B2B] p-6 transition-all hover:shadow-md dark:border-gray-200">
                <div className="pointer-events-none absolute inset-0 border-2 border-[#2B2B2B]/20 dark:border-gray-200/20" />
                <div className="relative">
                  <h2 className="mb-4 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                    {t('assignment:submit.assignmentDescription', '作業說明')}
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{assignment.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Details Card */}
            <div className="group relative border-2 border-[#2B2B2B] p-6 transition-all hover:shadow-md dark:border-gray-200">
              <div className="pointer-events-none absolute inset-0 border-2 border-[#2B2B2B]/20 dark:border-gray-200/20" />
              <div className="relative">
                <h2 className="mb-4 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                  {t('assignment:submit.assignmentDetails', '作業資訊')}
                </h2>
                <div className="space-y-4">
                  {/* Due Date */}
                  {assignment.dueDate && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('assignment:submit.dueDate', '截止日期')}:
                      </span>
                      <span
                        className={`text-sm ${
                          isOverdue
                            ? 'font-medium text-[#D2691E] dark:text-[#E87D3E]'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {assignment.formattedDueDate}
                        {isOverdue && ` (${t('assignment:submit.overdue', '已逾期')})`}
                      </span>
                    </div>
                  )}

                  {/* Rubric - Redesigned with Better UX */}
                  {assignment.rubric && (() => {
                    // Parse and transform criteria to categories
                    let categories: any[] = [];
                    try {
                      let criteria: any[] = [];
                      if (typeof assignment.rubric.criteria === 'string') {
                        criteria = JSON.parse(assignment.rubric.criteria);
                      } else if (Array.isArray(assignment.rubric.criteria)) {
                        criteria = assignment.rubric.criteria as any[];
                      }
                      
                      categories = dbCriteriaToUICategories(criteria);
                    } catch (error) {
                      console.error('Failed to parse rubric criteria:', error);
                    }

                    const stats = categories.length > 0 ? calculateRubricStats(categories) : { maxScore: 0 };
                    const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
                      new Set() // All collapsed by default
                    );

                    const toggleCategory = (categoryId: string) => {
                      setExpandedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(categoryId)) {
                          next.delete(categoryId);
                        } else {
                          next.add(categoryId);
                        }
                        return next;
                      });
                    };

                    return (
                      <div className="space-y-4">
                        {/* Rubric Header */}
                        <div className="border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rotate-45 border border-[#E07A5F] dark:border-[#E87D3E]" />
                                <h3 className="font-serif text-base font-light text-[#2B2B2B] dark:text-gray-100">
                                  {assignment.rubric.name}
                                </h3>
                              </div>
                              {assignment.rubric.description && (
                                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                  {assignment.rubric.description}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 border-2 border-[#E07A5F] px-4 py-2 dark:border-[#E87D3E]">
                              <div className="text-center">
                                <div className="font-serif text-2xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
                                  {stats.maxScore}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">總分</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Categories */}
                        {categories.length > 0 ? (
                          <div className="space-y-3">
                            {categories.map((category: any, categoryIndex: number) => {
                              const isExpanded = expandedCategories.has(category.id);
                              const categoryScore = category.criteria.length * 4;

                              return (
                                <div
                                  key={category.id}
                                  className="group border-2 border-[#2B2B2B] transition-all hover:shadow-sm dark:border-gray-200"
                                >
                                  {/* Category Header - Clickable */}
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full border-b-2 border-[#2B2B2B] bg-[#FAF9F6] p-4 text-left transition-colors hover:bg-[#F5F3EE] dark:border-gray-200 dark:bg-gray-900/30 dark:hover:bg-gray-900/50"
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3">
                                        {/* Expand/Collapse Icon */}
                                        <div className="flex-shrink-0">
                                          <svg
                                            className={`h-4 w-4 text-[#2B2B2B] transition-transform dark:text-gray-200 ${
                                              isExpanded ? 'rotate-90' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                        
                                        {/* Category Number Badge */}
                                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-[#2B2B2B] dark:border-gray-200">
                                          <span className="font-serif text-sm text-[#2B2B2B] dark:text-gray-200">
                                            {categoryIndex + 1}
                                          </span>
                                        </div>
                                        
                                        {/* Category Name */}
                                        <h4 className="font-serif text-base font-light text-[#2B2B2B] dark:text-gray-100">
                                          {category.name}
                                        </h4>
                                      </div>
                                      
                                      {/* Category Score */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-500">
                                          {category.criteria.length} 項標準
                                        </span>
                                        <div className="border-l-2 border-[#E07A5F] pl-3 dark:border-[#E87D3E]">
                                          <span className="font-serif text-lg font-medium text-[#E07A5F] dark:text-[#E87D3E]">
                                            {categoryScore}
                                          </span>
                                          <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">分</span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>

                                  {/* Criteria List - Collapsible */}
                                  {isExpanded && (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                      {category.criteria.map((criterion: any, criterionIndex: number) => (
                                        <div 
                                          key={criterion.id} 
                                          className="bg-white p-4 transition-colors hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900/50"
                                        >
                                          <div className="flex items-start gap-4">
                                            {/* Criterion Number */}
                                            <div className="flex-shrink-0 pt-0.5">
                                              <span className="font-mono text-xs text-gray-500 dark:text-gray-500">
                                                {categoryIndex + 1}.{criterionIndex + 1}
                                              </span>
                                            </div>
                                            
                                            {/* Criterion Content */}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-[#2B2B2B] dark:text-gray-100">
                                                {criterion.name}
                                              </p>
                                              {criterion.description && (
                                                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                                  {criterion.description}
                                                </p>
                                              )}
                                            </div>
                                            
                                            {/* Criterion Score Badge */}
                                            <div className="flex-shrink-0">
                                              <div className="flex h-8 w-8 items-center justify-center border border-[#E07A5F]/30 bg-[#E07A5F]/5 dark:border-[#E87D3E]/30 dark:bg-[#E87D3E]/5">
                                                <span className="font-serif text-xs font-medium text-[#E07A5F] dark:text-[#E87D3E]">
                                                  4
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="border-2 border-[#2B2B2B] p-8 text-center dark:border-gray-200">
                            <p className="text-sm italic text-gray-400">尚未設定評分項目</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* File Upload Card */}
            <div className="group relative border-2 border-[#2B2B2B] p-6 transition-all hover:shadow-md dark:border-gray-200">
              <div className="pointer-events-none absolute inset-0 border-2 border-[#2B2B2B]/20 dark:border-gray-200/20" />
              <div className="relative">
                <h2 className="mb-4 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                  {t('assignment:submit.uploadWork', '上傳作業')}
                </h2>

                {state.phase === 'upload' ? (
                  <CompactFileUpload maxFiles={1} onUploadComplete={handleFileUpload} />
                ) : (
                  <div className="space-y-4">
                    {/* Uploaded file display */}
                    <div className="flex items-center gap-3 border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[#2B2B2B] dark:border-gray-200">
                        <span className="text-lg">📄</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-medium text-[#2B2B2B] dark:text-gray-100">{state.file?.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.round((state.file?.size || 0) / 1024)} KB
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      {/* Direct Grading Switch */}
                      {(state.phase === 'analyze' || state.phase === 'submit') && !state.loading && (
                        <div className="flex items-center gap-2 border-2 border-[#2B2B2B] p-3 dark:border-gray-200">
                          <Switch
                            id="direct-grading-mode"
                            checked={useDirectGrading}
                            onCheckedChange={setUseDirectGrading}
                          />
                          <Label htmlFor="direct-grading-mode" className="cursor-pointer text-sm">
                            {t('grading:directGradingMode', 'Direct Grading Mode (Faster)')}
                          </Label>
                        </div>
                      )}

                      {/* Primary Action: AI Analysis or Re-analysis */}
                      {(state.phase === 'analyze' || state.phase === 'submit') && (
                        <Button
                          onClick={startAnalysis}
                          disabled={state.loading}
                          variant={
                            getSubmissionStatus().isSubmitted && !getSubmissionStatus().hasNewAnalysis
                              ? 'outline'
                              : 'default'
                          }
                          className="w-full border-2 border-[#2B2B2B] py-3 font-medium transition-colors hover:bg-[#D2691E] hover:text-white dark:border-gray-200 dark:hover:bg-[#E87D3E]"
                        >
                          {state.loading
                            ? '評分中...'
                            : getSubmissionStatus().isSubmitted && !getSubmissionStatus().hasNewAnalysis
                              ? '重新評分'
                              : '進行評分'}
                        </Button>
                      )}

                      {/* Submit Assignment */}
                      {state.phase === 'submit' &&
                        getSubmissionStatus().hasAnalysis &&
                        getSubmissionStatus().hasNewAnalysis && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block w-full">
                                  <Button
                                    onClick={submitFinal}
                                    disabled={state.loading || getSubmissionStatus().isOverdue}
                                    className="w-full border-2 border-[#2B2B2B] bg-[#2B2B2B] py-3 font-medium text-white transition-colors hover:bg-[#D2691E] dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-[#E87D3E]"
                                  >
                                    {getSubmissionStatus().isOverdue
                                      ? t('assignment:submit.overdueCannotSubmit')
                                      : t('assignment:submit.submitAssignment')}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {getSubmissionStatus().isOverdue && (
                                <TooltipContent>
                                  <p>{t('assignment:submit.overdueTooltip')}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}

                      {/* Reselect File */}
                      <Button
                        variant="outline"
                        onClick={handleResetFile}
                        className="w-full border-2 border-[#2B2B2B] text-sm dark:border-gray-200"
                      >
                        {t('assignment:submit.reselectFile')}
                      </Button>
                    </div>

                    {/* Error Display */}
                    {state.error && (
                      <div className="border-2 border-[#D2691E] bg-[#D2691E]/5 p-4 dark:border-[#E87D3E]">
                        <p className="text-sm font-medium text-[#D2691E] dark:text-[#E87D3E]">{state.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Grading Results - Independent Scrolling */}
        <aside ref={rightPanelRef} className="w-full lg:w-1/2 overflow-y-auto bg-background hide-scrollbar">
          <div className="p-4 sm:px-6 lg:px-8 py-8">
            {state.session?.result ? (
              <GradingResultDisplay
                result={state.session.result}
                normalizedScore={state.session.result._normalizedScore}
                thoughtSummary={state.session.thoughtSummary}
                thinkingProcess={state.session.thinkingProcess}
                gradingRationale={state.session.gradingRationale}
                isLoading={state.loading}
              />
            ) : (
              /* Empty State - Inviting & Organic */
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center space-y-6 px-8 text-center">
                {/* Icon with organic background blob */}
                <div className="relative">
                  {/* Background blob */}
                  <div className="absolute -inset-8 rounded-full bg-[#E07A5F]/10 blur-2xl"></div>
                  
                  {/* Sparkle Icon */}
                  <div className="relative">
                    <svg
                      className="h-16 w-16 text-[#E07A5F] dark:text-[#E87D3E]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      {/* Sparkle paths */}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Main Title */}
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
                    {state.loading
                      ? t('grading:ai.analyzing', 'AI 評分分析中...')
                      : t('assignment:submit.readyToAnalyze', '準備進行分析')}
                  </h3>

                  {/* Description */}
                  <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {state.loading
                      ? t(
                          'grading:ai.analyzingDescription',
                          'AI 正在仔細分析您的作業，這個過程會根據評分標準給予詳細回饋。'
                        )
                      : t(
                          'assignment:submit.awaitingDescription',
                          '上傳您的作業後，我將根據評分標準提供結構與邏輯的完整回饋。'
                        )}
                  </p>
                </div>

                {/* Loading indicator or decorative element */}
                {state.loading ? (
                  <div className="space-y-4">
                    {/* Elegant loading bar */}
                    <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-[#E07A5F] to-[#D2691E] dark:from-[#E87D3E] dark:to-[#D2691E]"></div>
                    </div>

                    {/* AI thinking preview */}
                    {state.session?.thinkingProcess && (
                      <div className="mx-auto max-w-2xl border-l-2 border-[#E07A5F]/30 pl-4 text-left dark:border-[#E87D3E]/30">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">
                          {t('grading:aiThinkingProcess', 'AI 思考過程')}:
                        </p>
                        <div className="mt-2 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar">
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {state.session.thinkingProcess}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Subtle decorative dots when idle */
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#E07A5F]/40"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#E07A5F]/20"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#E07A5F]/10"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: Tab Navigation (below lg) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:hidden flex flex-col h-full">
        <div className="border-b shrink-0 bg-background">
          <TabsList className="w-full h-12 bg-transparent border-0 rounded-none p-0 grid grid-cols-2">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E07A5F] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm">
              資訊
            </TabsTrigger>
            <TabsTrigger value="results" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E07A5F] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm">
              結果
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="info" className="flex-1 overflow-y-auto m-0 p-4 space-y-4 min-h-0">
          {/* Assignment Info Card - Combined */}
          <div className="border-2 border-[#2B2B2B] p-4 space-y-4 dark:border-gray-200">
            {/* Header */}
            <div>
              <h1 className="mb-2 font-serif text-xl font-light">{assignment.name}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{assignment.course.name}</p>
            </div>

            {/* Description */}
            {assignment.description && (
              <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
                <h2 className="mb-2 font-serif text-sm font-light text-gray-600 dark:text-gray-400">作業說明</h2>
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{assignment.description}</p>
              </div>
            )}

            {/* Due Date */}
            {assignment.dueDate && (
              <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">截止日期</span>
                  <span className={`text-sm ${isOverdue ? 'font-medium text-[#D2691E] dark:text-[#E87D3E]' : 'text-gray-700 dark:text-gray-300'}`}>
                    {assignment.formattedDueDate}
                    {isOverdue && ' (已逾期)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rubric */}
          {assignment.rubric && (() => {
            let categories: any[] = [];
            try {
              let criteria: any[] = [];
              if (typeof assignment.rubric.criteria === 'string') {
                criteria = JSON.parse(assignment.rubric.criteria);
              } else if (Array.isArray(assignment.rubric.criteria)) {
                criteria = assignment.rubric.criteria as any[];
              }
              categories = dbCriteriaToUICategories(criteria);
            } catch (error) {
              console.error('Failed to parse rubric criteria:', error);
            }

            const stats = categories.length > 0 ? calculateRubricStats(categories) : { maxScore: 0 };
            const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

            const toggleCategory = (categoryId: string) => {
              setExpandedCategories(prev => {
                const next = new Set(prev);
                if (next.has(categoryId)) {
                  next.delete(categoryId);
                } else {
                  next.add(categoryId);
                }
                return next;
              });
            };

            return (
              <div className="space-y-3">
                {/* Rubric Header */}
                <div className="border-2 border-[#2B2B2B] p-3 dark:border-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-sm font-light text-[#2B2B2B] dark:text-gray-100 mb-1">
                        {assignment.rubric.name}
                      </h3>
                      {assignment.rubric.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {assignment.rubric.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 border-2 border-[#E07A5F] px-3 py-1 dark:border-[#E87D3E]">
                      <div className="text-center">
                        <div className="font-serif text-xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
                          {stats.maxScore}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">總分</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.map((category: any, categoryIndex: number) => {
                      const isExpanded = expandedCategories.has(category.id);
                      const categoryScore = category.criteria.length * 4;

                      return (
                        <div key={category.id} className="border-2 border-[#2B2B2B] dark:border-gray-200">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full border-b border-[#2B2B2B] bg-[#FAF9F6] p-3 text-left dark:border-gray-200 dark:bg-gray-900/30"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className={`h-3 w-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="font-serif text-xs font-medium text-[#2B2B2B] dark:text-gray-200">
                                  {categoryIndex + 1}
                                </span>
                                <h4 className="font-serif text-sm font-light text-[#2B2B2B] dark:text-gray-100 truncate">
                                  {category.name}
                                </h4>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="font-serif text-sm font-medium text-[#E07A5F] dark:text-[#E87D3E]">
                                  {categoryScore}分
                                </span>
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                              {category.criteria.map((criterion: any, criterionIndex: number) => (
                                <div key={criterion.id} className="bg-white p-3 dark:bg-gray-950">
                                  <div className="flex items-start gap-2">
                                    <span className="font-mono text-xs text-gray-500 flex-shrink-0 pt-0.5">
                                      {categoryIndex + 1}.{criterionIndex + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-[#2B2B2B] dark:text-gray-100">
                                        {criterion.name}
                                      </p>
                                      {criterion.description && (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                          {criterion.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0">
                                      <span className="text-xs font-medium text-[#E07A5F] dark:text-[#E87D3E]">4</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-[#2B2B2B] p-4 text-center dark:border-gray-200">
                    <p className="text-xs italic text-gray-400">尚未設定評分項目</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* File Upload Section */}
          <div className="border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
            <h2 className="mb-3 font-serif font-light">上傳作業</h2>
            {state.phase === 'upload' ? (
              <CompactFileUpload maxFiles={1} onUploadComplete={handleFileUpload} />
            ) : (
              <div className="space-y-3">
                {/* Uploaded file display */}
                <div className="flex items-center gap-3 border border-[#2B2B2B] p-3 dark:border-gray-200">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[#2B2B2B] dark:text-gray-100">{state.file?.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{Math.round((state.file?.size || 0) / 1024)} KB</p>
                  </div>
                </div>
                
                <Button variant="outline" onClick={handleResetFile} className="w-full border-2 border-[#2B2B2B] dark:border-gray-200">重新選擇</Button>
              </div>
            )}
          </div>
          
          {/* Action Buttons - Outside container */}
          {state.file && (
            <div className="space-y-3">
              {/* AI Analysis Button - Bright accent color */}
              {(state.phase === 'analyze' || state.phase === 'submit') && (
                <Button 
                  onClick={() => { startAnalysis(); setActiveTab('results'); }} 
                  disabled={state.loading} 
                  className="w-full border-2 border-[#E07A5F] bg-[#E07A5F] py-3 font-medium text-white transition-colors hover:bg-[#D2691E] dark:border-[#E87D3E] dark:bg-[#E87D3E] dark:hover:bg-[#D2691E]"
                >
                  {state.loading ? '評分中...' : '進行評分'}
                </Button>
              )}
              
              {/* Submit Button */}
              {state.phase === 'submit' && getSubmissionStatus().hasNewAnalysis && (
                <Button 
                  onClick={submitFinal} 
                  disabled={getSubmissionStatus().isOverdue} 
                  className="w-full border-2 border-[#2B2B2B] bg-[#2B2B2B] py-3 font-medium text-white transition-colors hover:bg-[#D2691E] dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-[#E87D3E]"
                >
                  {getSubmissionStatus().isOverdue ? '已逾期' : '提交作業'}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="flex-1 overflow-y-auto m-0 p-4 min-h-0">
          {state.session?.result ? (
            <GradingResultDisplay
              result={state.session.result}
              normalizedScore={state.session.result._normalizedScore}
              thoughtSummary={state.session.thoughtSummary}
              thinkingProcess={state.session.thinkingProcess}
              gradingRationale={state.session.gradingRationale}
              isLoading={state.loading}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 text-center">
              <svg className="h-12 w-12 text-[#E07A5F] dark:text-[#E87D3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">{state.loading ? '評分中...' : '上傳作業後開始評分'}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.assignment" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.assignment" returnTo="/student" />;
}
