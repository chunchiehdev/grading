import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission, getDraftSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { FeedbackChat, type SparringState } from '@/components/grading/FeedbackChat';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { ClientOnly } from '@/components/ui/client-only';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Play, Check, FolderOpen, Loader2, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useUploadStore } from '@/stores/uploadStore';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { dbCriteriaToUICategories } from '@/utils/rubric-transform';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { assignmentId } = params;

  if (!assignmentId) throw new Response('Assignment not found', { status: 404 });

  const url = new URL(request.url);
  const isResubmit = url.searchParams.get('resubmit') === '1';

  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id, true);
  if (!assignment) throw new Response('Assignment not found', { status: 404 });

  // Check if student already has a submitted (non-draft) submission for this assignment
  if (assignment.submissions && assignment.submissions.length > 0) {
    const latestSubmission = assignment.submissions[0];

    // 預設：任何非 DRAFT 紀錄都先帶去「繳交紀錄」頁
    if (!isResubmit) {
      // Before redirecting, check if there's an in-progress DRAFT version
      // If a DRAFT exists (e.g., resubmit was started but not finished), 
      // auto-redirect to resubmit mode instead of the old submission page
      if (latestSubmission.status !== 'DRAFT') {
        const draftCheck = await getDraftSubmission(assignmentId, student.id);
        if (draftCheck && draftCheck.status === 'DRAFT') {
          // Student has an in-progress draft - redirect to resubmit mode
          throw new Response(null, {
            status: 302,
            headers: { Location: `/student/assignments/${assignmentId}/submit?resubmit=1` },
          });
        }
        throw new Response(null, {
          status: 302,
          headers: { Location: `/student/submissions/${latestSubmission.id}` },
        });
      }
    } else {
      // resubmit 模式：只允許非 GRADED 的重新進入提交流程
      if (latestSubmission.status === 'GRADED') {
        throw new Response(null, {
          status: 302,
          headers: { Location: `/student/submissions/${latestSubmission.id}` },
        });
      }
      // SUBMITTED / ANALYZED 會繼續往下，讓學生重新上傳 + 重新評分
    }
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
  phase: 'upload' | 'analyze' | 'sparring' | 'submit' | 'done';
  file: { id: string; name: string; size: number } | null;
  session: { 
    id: string; 
    result: any; 
    thoughtSummary?: string;
    thinkingProcess?: string; // Feature 012
    gradingRationale?: string; // Feature 012
    /** Per-question conversation map: { [questionIdx]: messages[] } */
    chatMessagesMap?: Record<number, any[]>;
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
  | { type: 'sparring_completed' }
  | { type: 'submission_completed'; sessionId: string }
  | { type: 'chat_updated'; conversationsMap: Record<number, any[]> }
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
       // Check if there are sparring questions
       const hasSparring = action.result.sparringQuestions && action.result.sparringQuestions.length > 0;
      return { 
        ...state, 
        phase: hasSparring ? 'sparring' : 'submit', 
        loading: false, 
        session: { 
          ...state.session!, 
          result: action.result, 
          thoughtSummary: action.thoughtSummary,
          thinkingProcess: action.thinkingProcess,
          gradingRationale: action.gradingRationale
        } 
      };
    case 'sparring_completed':
      return { ...state, phase: 'submit' };
    case 'submission_completed':
      // Store the submitted sessionId to prevent duplicate submissions
      return { ...state, phase: 'done', loading: false, lastSubmittedSessionId: action.sessionId };
    case 'chat_updated':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          chatMessagesMap: action.conversationsMap
        }
      };
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

  // Rubric state - hoisted out of render IIFE for proper React hooks usage
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [selectedCriterion, setSelectedCriterion] = React.useState<{
    name: string;
    description: string;
    levels: { score: number; description: string }[];
    label: string; // e.g. "1.2"
  } | null>(null);

  const toggleCategory = React.useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Persisted sparring progress (which questions are done / active / phase)
  const [sparringState, setSparringState] = React.useState<SparringState | undefined>(() => {
    const raw = (draftSubmission?.aiAnalysisResult as any)?._sparringState;
    return raw || undefined;
  });

  // Parse rubric criteria once
  const rubricCategories = React.useMemo(() => {
    if (!assignment.rubric?.criteria) return [];
    try {
      let criteria: unknown[] = [];
      if (typeof assignment.rubric.criteria === 'string') {
        criteria = JSON.parse(assignment.rubric.criteria);
      } else if (Array.isArray(assignment.rubric.criteria)) {
        criteria = assignment.rubric.criteria as unknown[];
      }
      return dbCriteriaToUICategories(criteria as Parameters<typeof dbCriteriaToUICategories>[0]);
    } catch (error) {
      console.error('Failed to parse rubric criteria:', error);
      return [];
    }
  }, [assignment.rubric?.criteria]);



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
    // Distinguish sparring from submit: if sparringState exists and phase is 'chat', it's sparring
    phase:
      draftSubmission?.lastState === 'completed'
        ? ((draftSubmission?.aiAnalysisResult as any)?._sparringState?.phase === 'chat' ? 'sparring' : 'submit')
        : draftSubmission?.lastState === 'sparring'
          ? 'sparring'
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
            chatMessagesMap: (draftSubmission.aiAnalysisResult as any)?._chatMessagesMap || undefined,
          }
        : null,
    error: null,
    loading: !!draftSubmission?.sessionId && draftSubmission?.lastState !== 'completed' && draftSubmission?.lastState !== 'sparring',
    // If status is SUBMITTED/ANALYZED/GRADED, this sessionId has been submitted
    lastSubmittedSessionId:
      draftSubmission?.status && draftSubmission.status !== 'DRAFT'
        ? draftSubmission.sessionId || null
        : null,
  });

  // Debounced auto-save of chatMessagesMap to draft (persist across page refresh)
  const chatSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build the save payload (shared between debounce and beforeunload)
  const buildChatSavePayload = useCallback(() => {
    if (!state.session?.chatMessagesMap || Object.keys(state.session.chatMessagesMap).length === 0) return null;
    if (!state.session?.result) return null;

    // Check if there's at least one real message across all conversations
    const hasRealMessages = Object.values(state.session.chatMessagesMap).some(
      (msgs) => msgs && msgs.length > 1
    );
    if (!hasRealMessages) return null;

    const aiResultWithChat = {
      ...state.session.result,
      _chatMessagesMap: state.session.chatMessagesMap,
      _sparringState: sparringState,
    };
    return {
      // CRITICAL: Include fileMetadata + sessionId so saveDraftSubmission can create
      // a new DRAFT version if the existing submission is SUBMITTED/ANALYZED.
      // Without these, saveDraftSubmission silently returns null for non-DRAFT submissions.
      ...(state.file ? {
        fileMetadata: {
          fileId: state.file.id,
          fileName: state.file.name,
          fileSize: state.file.size,
        },
      } : {}),
      sessionId: state.session.id || undefined,
      aiAnalysisResult: aiResultWithChat,
      lastState: state.phase === 'sparring' ? 'sparring' : 'completed',
    };
  }, [state.session?.chatMessagesMap, state.session?.result, state.phase, state.file, state.session?.id, sparringState]);

  useEffect(() => {
    const payload = buildChatSavePayload();
    if (!payload) return;

    // Debounce: save 2 seconds after last message change
    if (chatSaveTimerRef.current) clearTimeout(chatSaveTimerRef.current);
    chatSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/student/assignments/${assignment.id}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Failed to save chat messages to draft:', err);
      }
    }, 2000);

    return () => {
      if (chatSaveTimerRef.current) clearTimeout(chatSaveTimerRef.current);
    };
  }, [state.session?.chatMessagesMap, state.session?.result, assignment.id, sparringState, state.phase, buildChatSavePayload]);

  // beforeunload: flush pending saves immediately via sendBeacon to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Cancel the debounce timer since we're saving immediately
      if (chatSaveTimerRef.current) {
        clearTimeout(chatSaveTimerRef.current);
        chatSaveTimerRef.current = null;
      }

      const payload = buildChatSavePayload();
      if (!payload) return;

      // Use sendBeacon for reliable delivery during page unload
      const blob = new Blob(
        [JSON.stringify(payload)],
        { type: 'application/json' }
      );
      navigator.sendBeacon(
        `/api/student/assignments/${assignment.id}/draft`,
        blob
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [assignment.id, buildChatSavePayload]);

  // Auto-transition from 'sparring' → 'submit' when all questions are completed
  // Previously triggered by a manual button in FeedbackChat; now driven by sparringState
  useEffect(() => {
    if (
      state.phase === 'sparring' &&
      sparringState?.phase === 'summary'
    ) {
      dispatch({ type: 'sparring_completed' });
    }
  }, [state.phase, sparringState?.phase]);

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
      if (!sessionData.success) {
        // API returns error as object: { message: string, code?: string }
        const errorMessage = typeof sessionData.error === 'string' 
          ? sessionData.error 
          : sessionData.error?.message || 'Failed to create session';
        throw new Error(errorMessage);
      }

      dispatch({ type: 'analysis_started', sessionId: sessionData.data.sessionId });

      // Start grading FIRST - only save draft if grading actually starts
      const startForm = new FormData();
      startForm.append('action', 'start');
      startForm.append('useDirectGrading', String(useDirectGrading));
      const startRes = await fetch(`/api/grading/session/${sessionData.data.sessionId}`, {
        method: 'POST',
        body: startForm,
      });
      const startData = await startRes.json();
      if (!startData.success) {
        // API returns error as object: { message: string, code?: string }
        const errorMessage = typeof startData.error === 'string' 
          ? startData.error 
          : startData.error?.message || 'Failed to start grading';
        throw new Error(errorMessage);
      }

      // Only save draft with sessionId AFTER grading successfully started
      // This prevents stuck 'analyzing' state if grading fails (e.g., AI access denied)
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
      // Flatten all conversations into a single array for final submission storage
      const allMessages: any[] = [];
      if (state.session.chatMessagesMap) {
        const sortedKeys = Object.keys(state.session.chatMessagesMap)
          .map(Number)
          .sort((a, b) => a - b);
        for (const key of sortedKeys) {
          const msgs = state.session.chatMessagesMap[key];
          if (msgs && msgs.length > 0) {
            allMessages.push(...msgs);
          }
        }
      }

      const res = await fetch('/api/student/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          uploadedFileId: state.file.id,
          sessionId: state.session.id,
          chatMessages: allMessages
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

  // Removed handledSparringResponse locally since useChat sends via API directly

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

  // Require at least one real student reply before allowing submit
  const hasStudentSparringReply = React.useMemo(() => {
    const sparringQuestions = state.session?.result?.sparringQuestions;
    const chatMessagesMap = state.session?.chatMessagesMap;

    // If沒有 sparring 題目，本來就不需要互動，直接允許送出
    if (!sparringQuestions || sparringQuestions.length === 0) return true;
    if (!chatMessagesMap || Object.keys(chatMessagesMap).length === 0) return false;

    const TRIGGER_TEXT =
      '請根據你在 system prompt 中看到的學生作業跟 sparring question 來開始對話，用口語化、溫暖的方式開場。';

    const extractText = (message: any) => {
      if (typeof message.content === 'string') return message.content;
      if (Array.isArray(message.parts)) {
        return message.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }
      return '';
    };

    // Check ALL conversations across all questions for at least one real student reply
    return Object.values(chatMessagesMap).some((messages: any[]) =>
      messages.some((m: any) => {
        if (m.role !== 'user') return false;
        const text = extractText(m).trim();
        if (!text) return false;
        // 排除系統自動丟給後端啟動對話的 trigger 文案
        return text !== TRIGGER_TEXT;
      })
    );
  }, [state.session?.result?.sparringQuestions, state.session?.chatMessagesMap]);

  return (
    <div ref={containerRef} className="w-full flex flex-col lg:h-full">
      {/* Desktop: Split Panel Layout (lg and above) */}
      <div className="hidden lg:flex flex-row flex-1 overflow-hidden min-h-0">
        {/* Left Column: Assignment Cards - Scrollable */}
        <div ref={leftPanelRef} className="w-full lg:w-1/2 overflow-y-auto border-r-0 lg:border-r border-border hide-scrollbar">
          <div className="space-y-6 p-4 sm:px-6 lg:px-8 py-8">
            {/* Assignment Header Card - Bento Style */}
            <div className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition-all duration-200">
              <h1 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {assignment.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{assignment.course.name}</span>
                <span>·</span>
                <span>{assignment.course.teacher.name || assignment.course.teacher.email}</span>
              </div>
            </div>

            {/* Assignment Description Card - Bento Style */}
            {assignment.description && (
              <div className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition-all duration-200">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {t('assignment:submit.assignmentDescription')}
                </h2>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{assignment.description}</p>
                </div>
              </div>
            )}

            {/* Due Date Card - Bento Style */}
            {assignment.dueDate && (
              <div className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition-all duration-200">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {t('assignment:submit.dueDate')}
                </h2>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span
                    className={`text-base font-semibold ${
                      isOverdue
                        ? 'text-destructive'
                        : 'text-foreground'
                    }`}
                  >
                    {assignment.formattedDueDate}
                    {isOverdue && ` (${t('assignment:submit.overdueLabel')})`}
                  </span>
                </div>
              </div>
            )}

            {/* Rubric Card - Bento Style */}
            {assignment.rubric && (
              <div className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition-all duration-200">
                <div className="space-y-4">
                  {/* Rubric Header */}
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      {t('assignment:submit.rubricCriteria')}
                    </h2>
                    <h3 className="text-sm font-medium text-foreground">
                      {assignment.rubric.name}
                    </h3>
                    {assignment.rubric.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {assignment.rubric.description}
                      </p>
                    )}
                  </div>

                  {/* Categories */}
                  {rubricCategories.length > 0 ? (
                    <div className="space-y-2">
                      {rubricCategories.map((category, categoryIndex) => {
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                          <div
                            key={category.id}
                            className="rounded-xl bg-muted/30 border border-border overflow-hidden hover:shadow-sm transition-all duration-200"
                          >
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="w-full bg-muted/50 p-4 text-left transition-colors hover:bg-muted"
                            >
                              <div className="flex items-center gap-3">
                                <svg
                                  className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <h4 className="text-sm font-medium text-foreground">
                                  {category.name}
                                </h4>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {category.criteria.length} {t('common:items', '項')}
                                </span>
                              </div>
                            </button>

                            {/* Criteria List */}
                            {isExpanded && (
                              <div className="divide-y divide-border bg-card">
                                {category.criteria.map((criterion, criterionIndex) => (
                                  <button
                                    key={criterion.id}
                                    className="w-full p-4 text-left transition-colors hover:bg-accent/50 group"
                                    onClick={() => setSelectedCriterion({
                                      name: criterion.name,
                                      description: criterion.description,
                                      levels: criterion.levels,
                                      label: `${categoryIndex + 1}.${criterionIndex + 1}`,
                                    })}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                          {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                                        </p>
                                        {criterion.description && (
                                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                            {criterion.description}
                                          </p>
                                        )}
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border p-8 text-center bg-muted/20">
                      <p className="text-sm text-muted-foreground">{t('assignment:submit.noCriteriaSet')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Upload Card - Bento Style */}
            <div className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition-all duration-200">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                {t('assignment:submit.uploadWork')}
              </h2>

              {state.phase === 'upload' ? (
                <CompactFileUpload maxFiles={1} onUploadComplete={handleFileUpload} />
              ) : (
                <div className="space-y-4">
                  {/* Uploaded file display */}
                  <div className="flex items-center gap-4 rounded-xl bg-muted/50 border border-border p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium text-foreground">{state.file?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((state.file?.size || 0) / 1024)} KB
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Direct Grading Switch */}
                    {(state.phase === 'analyze' || state.phase === 'submit') && !state.loading && (
                      <div className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border p-4">
                        <Switch
                          id="direct-grading-mode"
                          checked={useDirectGrading}
                          onCheckedChange={setUseDirectGrading}
                        />
                        <Label htmlFor="direct-grading-mode" className="cursor-pointer text-sm text-foreground">
                          {t('assignment:submit.quickGradingMode')}
                        </Label>
                      </div>
                    )}

                    {/* Primary Actions Row */}
                    <div className="flex items-center justify-center gap-4 py-2">
                      {/* Reselect File */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              onClick={handleResetFile}
                              className="h-14 w-14 rounded-full bg-card border border-border shadow-md transition-all hover:shadow-lg hover:scale-105"
                            >
                              <FolderOpen className="h-6 w-6" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('assignment:submit.reselectFile')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Start Analysis */}
                      {(state.phase === 'analyze' || state.phase === 'submit') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={startAnalysis}
                                disabled={state.loading}
                                size="icon"
                                className={`h-16 w-16 rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105 ${
                                  state.loading 
                                    ? 'bg-muted' 
                                    : 'bg-primary hover:bg-primary/90'
                                }`}
                              >
                                {state.loading ? (
                                  <Loader2 className="h-7 w-7 animate-spin" />
                                ) : (
                                  <Play className="h-7 w-7 ml-0.5 fill-current" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {state.loading
                                  ? t('assignment:submit.grading')
                                  : getSubmissionStatus().isSubmitted && !getSubmissionStatus().hasNewAnalysis
                                    ? t('assignment:submit.reGrade')
                                    : t('assignment:submit.startGrading')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Submit Assignment */}
                      {state.phase === 'submit' &&
                        getSubmissionStatus().hasAnalysis &&
                        getSubmissionStatus().hasNewAnalysis && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={submitFinal}
                                  disabled={
                                    state.loading ||
                                    getSubmissionStatus().isOverdue ||
                                    !hasStudentSparringReply
                                  }
                                  size="icon"
                                  className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50"
                                >
                                  <Check className="h-6 w-6 text-white" strokeWidth={3} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {getSubmissionStatus().isOverdue
                                    ? t('assignment:submit.overdueCannotSubmit')
                                    : t('assignment:submit.submitAssignment')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                    </div>
                  </div>

                  {/* Error Display */}
                  {state.error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                      <p className="text-sm font-medium text-destructive">{state.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Grading Results - Independent Scrolling */}
        <aside ref={rightPanelRef} className="w-full lg:w-1/2 overflow-y-auto bg-background hide-scrollbar">
          <div className="p-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
            {state.session?.result ? (
              state.session.result.sparringQuestions && state.session.result.sparringQuestions.length > 0 ? (
                <FeedbackChat
                  sparringQuestions={state.session.result.sparringQuestions}
                  assignmentId={assignment.id}
                  sessionId={state.session.id}
                  result={state.session.result}
                  studentName={student.name}
                  studentPicture={student.picture}
                  fileId={state.file?.id}
                  initialConversationsMap={state.session?.chatMessagesMap}
                  thinkingProcess={state.session?.thinkingProcess}
                  gradingRationale={state.session?.gradingRationale}
                  normalizedScore={state.session.result?.normalizedScore}
                  onChatChange={(conversationsMap) => dispatch({ type: 'chat_updated', conversationsMap })}
                  onSparringComplete={() => dispatch({ type: 'sparring_completed' })}
                  initialSparringState={sparringState}
                  onSparringStateChange={setSparringState}
                />
              ) : (
                <GradingResultDisplay
                  isLoading={state.loading}
                  thinkingProcess={state.session?.thinkingProcess}
                />
              )
            ) : (
              <GradingResultDisplay
                isLoading={state.loading}
                thinkingProcess={state.session?.thinkingProcess}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: Tab Navigation (below lg) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:hidden flex flex-col">
        <div className="border-b border-border shrink-0 bg-background">
          <TabsList className="w-full h-12 bg-transparent border-0 rounded-none p-0 grid grid-cols-2">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm">
              {t('assignment:submit.info')}
            </TabsTrigger>
            <TabsTrigger value="results" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm">
              {t('assignment:submit.results')}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="info" className="m-0">
          <div className="flex flex-col min-h-[calc(100dvh-10rem)] px-4 py-2">
            <div className="space-y-2 flex-1">
              {/* Assignment Info Card */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div>
                  <h1 className="mb-1 text-lg font-semibold text-foreground">{assignment.name}</h1>
                  <p className="text-xs text-muted-foreground">{assignment.course.name}</p>
                </div>
                {assignment.description && (
                  <div className="border-t border-border pt-3">
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed line-clamp-4">{assignment.description}</p>
                  </div>
                )}
              </div>

              {/* Due Date Card (mobile) */}
              {assignment.dueDate && (
                <div className="rounded-2xl bg-card border border-border p-4">
                  <h2 className="mb-2 text-sm font-semibold text-foreground">
                    {t('assignment:submit.dueDate')}
                  </h2>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {assignment.formattedDueDate}
                      </span>
                    </div>
                    {isOverdue && (
                      <span className="text-xs font-semibold text-destructive">
                        {t('assignment:submit.overdueLabel')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Rubric Card */}
              {assignment.rubric && (
                <div className="rounded-2xl bg-card border border-border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">
                        {t('assignment:submit.rubricCriteria')}
                      </h2>
                      <span className="text-xs text-muted-foreground">{assignment.rubric.name}</span>
                    </div>
                    {assignment.rubric.description && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {assignment.rubric.description}
                      </p>
                    )}
                    {rubricCategories.length > 0 ? (
                      <div className="space-y-1.5">
                        {rubricCategories.map((category, categoryIndex) => {
                          const isExpanded = expandedCategories.has(category.id);
                          return (
                            <div key={category.id} className="rounded-lg bg-card border border-border overflow-hidden">
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full bg-muted/50 px-3 py-2 text-left hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <svg className={`h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <h4 className="text-xs font-medium text-foreground truncate">{category.name}</h4>
                                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                    {category.criteria.length} {t('common:items', '項')}
                                  </span>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="divide-y divide-border bg-card">
                                  {category.criteria.map((criterion, criterionIndex) => (
                                    <button
                                      key={criterion.id}
                                      className="w-full px-3 py-2 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                                      onClick={() => setSelectedCriterion({
                                        name: criterion.name,
                                        description: criterion.description,
                                        levels: criterion.levels,
                                        label: `${categoryIndex + 1}.${criterionIndex + 1}`,
                                      })}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-foreground">
                                            {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                                          </p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border p-4 text-center bg-muted/20">
                        <p className="text-sm text-muted-foreground">{t('assignment:submit.noCriteriaSet')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Upload Card */}
              <div className="rounded-2xl bg-card border border-border p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{t('assignment:submit.uploadWork')}</h2>
                {state.phase === 'upload' ? (
                  <CompactFileUpload maxFiles={1} onUploadComplete={handleFileUpload} />
                ) : (
                  <div className="space-y-4">
                    {/* Uploaded file display */}
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border p-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{state.file?.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round((state.file?.size || 0) / 1024)} KB</p>
                      </div>
                    </div>

                    {/* Direct Grading Switch */}
                    {(state.phase === 'analyze' || state.phase === 'submit') && !state.loading && (
                      <div className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border p-3">
                        <Switch
                          id="mobile-direct-grading"
                          checked={useDirectGrading}
                          onCheckedChange={setUseDirectGrading}
                        />
                        <Label htmlFor="mobile-direct-grading" className="cursor-pointer text-sm text-foreground">
                          {t('assignment:submit.quickGradingMode')}
                        </Label>
                      </div>
                    )}

                    {/* Error Display */}
                    {state.error && (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive">{state.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Actions (mobile) */}
            <div className="pt-3 pb-2 flex items-center justify-center gap-4">
              {/* Reselect File */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={handleResetFile}
                      className="h-12 w-12 rounded-full bg-card border border-border shadow-md transition-all hover:shadow-lg active:scale-95"
                    >
                      <FolderOpen className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('assignment:submit.reselectFile')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Start Analysis (Play) */}
              {(state.phase === 'analyze' || state.phase === 'submit') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          startAnalysis();
                          setActiveTab('results');
                        }}
                        disabled={state.loading}
                        size="icon"
                        className={`h-14 w-14 rounded-full shadow-lg transition-all active:scale-95 ${
                          state.loading ? 'bg-muted' : 'bg-primary hover:bg-primary/90'
                        }`}
                      >
                        {state.loading ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Play className="h-6 w-6 ml-0.5 fill-current" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {state.loading
                          ? t('assignment:submit.grading')
                          : getSubmissionStatus().isSubmitted && !getSubmissionStatus().hasNewAnalysis
                            ? t('assignment:submit.reGrade')
                            : t('assignment:submit.startGrading')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Submit Assignment (Check) */}
              {state.phase === 'submit' &&
                getSubmissionStatus().hasAnalysis &&
                getSubmissionStatus().hasNewAnalysis && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={submitFinal}
                          disabled={
                            state.loading ||
                            getSubmissionStatus().isOverdue ||
                            !hasStudentSparringReply
                          }
                          size="icon"
                          className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Check className="h-5 w-5 text-white" strokeWidth={3} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {getSubmissionStatus().isOverdue
                            ? t('assignment:submit.overdueCannotSubmit')
                            : t('assignment:submit.submitAssignment')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="overflow-y-auto m-0 p-4">
          <div className="flex flex-col h-full">
            {state.session?.result ? (
              state.session.result.sparringQuestions && state.session.result.sparringQuestions.length > 0 ? (
                <FeedbackChat
                  sparringQuestions={state.session.result.sparringQuestions}
                  assignmentId={assignment.id}
                  sessionId={state.session.id}
                  result={state.session.result}
                  studentName={student.name}
                  studentPicture={student.picture}
                  fileId={state.file?.id}
                  initialConversationsMap={state.session?.chatMessagesMap}
                  thinkingProcess={state.session?.thinkingProcess}
                  gradingRationale={state.session?.gradingRationale}
                  normalizedScore={state.session.result?.normalizedScore}
                  onChatChange={(conversationsMap) => dispatch({ type: 'chat_updated', conversationsMap })}
                  onSparringComplete={() => dispatch({ type: 'sparring_completed' })}
                  initialSparringState={sparringState}
                  onSparringStateChange={setSparringState}
                />
              ) : (
                <GradingResultDisplay
                  isLoading={state.loading}
                  thinkingProcess={state.session?.thinkingProcess}
                />
              )
            ) : (
              <GradingResultDisplay
                isLoading={state.loading}
                thinkingProcess={state.session?.thinkingProcess}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Criterion Detail Sheet - shared by desktop & mobile */}
      <Sheet open={!!selectedCriterion} onOpenChange={(open) => !open && setSelectedCriterion(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-base font-semibold">
              {selectedCriterion?.label} {selectedCriterion?.name}
            </SheetTitle>
            {selectedCriterion?.description && (
              <SheetDescription className="text-sm leading-relaxed">
                {selectedCriterion.description}
              </SheetDescription>
            )}
          </SheetHeader>

          {/* Scoring Levels - Full width, single column, no truncation */}
          <div className="space-y-3 pb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('assignment:submit.scoringLevels')}
            </h4>
            {selectedCriterion?.levels && [4, 3, 2, 1].map((score) => {
              const level = selectedCriterion.levels.find((l) => l.score === score);
              const description = level?.description || '';
              const isTopLevel = score === 4;

              return (
                <div
                  key={score}
                  className={`rounded-xl p-4 transition-all ${
                    isTopLevel
                      ? 'bg-primary/5 border-2 border-primary/20'
                      : 'bg-muted/40 border border-border/50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`text-xl font-bold ${isTopLevel ? 'text-primary' : 'text-foreground/60'}`}>
                      {score}
                    </span>
                    <span className={`text-xs font-medium ${isTopLevel ? 'text-primary/80' : 'text-muted-foreground'}`}>
                      {t(`rubric:levelLabels.${score}`, score === 4 ? '優秀' : score === 3 ? '良好' : score === 2 ? '及格' : '需改進')}
                    </span>
                  </div>
                  {description ? (
                    <p className={`text-sm leading-relaxed ${isTopLevel ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                      {description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/40">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
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
