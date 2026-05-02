import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, useParams, Form, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { ClientOnly } from '@/components/ui/client-only';
import { useState, useEffect, useRef } from 'react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionByIdForTeacher, listSubmissionAiFeedbackComments } from '@/services/submission.server';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { PDFViewerWithNavigation } from '@/components/pdf/PDFViewerWithNavigation';
import {
  StudentInfoCompact,
  AssignmentInfoCompact,
} from '@/components/grading/CompactInfoComponents';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { SubmissionAiFeedbackCommentView, TeacherInfo, TeacherSubmissionView } from '@/types/teacher';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Trash2, Home, Clock3, CheckCircle2, PencilLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';


interface LoaderData {
  teacher: TeacherInfo;
  submission: TeacherSubmissionView;
}


interface ActionData {
  success?: boolean;
  error?: string;
  errorKey?: 'notFoundOrUnauthorized' | 'saveFailed' | 'invalidScore' | 'incompleteCriteriaScores';
}

const RubricCriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  maxScore: z.number(),
  levels: z
    .array(
      z.object({
        score: z.number(),
        description: z.string(),
      })
    )
    .optional()
    .default([]),
});

const RubricCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  criteria: z.array(RubricCriterionSchema),
});

const RubricCriteriaArraySchema = z.union([z.array(RubricCategorySchema), z.array(RubricCriterionSchema)]);

const HumanCriteriaScoreSchema = z.array(
  z.object({
    criteriaId: z.string(),
    score: z.number(),
    maxScore: z.number(),
  })
);

const TeacherReviewSchema = z.object({
  teacherFeedback: z.string().trim().max(5000).optional(),
});

function extractRubricCriteria(rawCriteria: unknown): Array<{
  criteriaId: string;
  name: string;
  description: string;
  maxScore: number;
  levels: Array<{ score: number; description: string }>;
}> {
  const parsed = RubricCriteriaArraySchema.safeParse(rawCriteria);
  if (!parsed.success || parsed.data.length === 0) {
    return [];
  }

  const firstItem = parsed.data[0];
  if (firstItem && typeof firstItem === 'object' && 'criteria' in firstItem) {
    const categories = parsed.data as z.infer<typeof RubricCategorySchema>[];
    return categories.flatMap((category) =>
      category.criteria.map((criterion) => ({
        criteriaId: criterion.id,
        name: criterion.name,
        description: criterion.description || '',
        maxScore: criterion.maxScore,
        levels: criterion.levels,
      }))
    );
  }

  const criteria = parsed.data as z.infer<typeof RubricCriterionSchema>[];
  return criteria.map((criterion) => ({
    criteriaId: criterion.id,
    name: criterion.name,
    description: criterion.description || '',
    maxScore: criterion.maxScore,
    levels: criterion.levels,
  }));
}

function extractSparringFromChatHistory(rawAiAnalysisResult: unknown): {
  decision: 'adopt' | 'keep' | null;
  reason: string | null;
  latencyMs: number | null;
  rounds: number | null;
  decisionAt: string | null;
  convergenceAt: string | null;
} {
  if (!rawAiAnalysisResult || typeof rawAiAnalysisResult !== 'object') {
    return {
      decision: null,
      reason: null,
      latencyMs: null,
      rounds: null,
      decisionAt: null,
      convergenceAt: null,
    };
  }

  const payload = rawAiAnalysisResult as { chatHistory?: unknown };
  if (!Array.isArray(payload.chatHistory)) {
    return {
      decision: null,
      reason: null,
      latencyMs: null,
      rounds: null,
      decisionAt: null,
      convergenceAt: null,
    };
  }

  const decisionMessage = [...payload.chatHistory]
    .reverse()
    .find((message) => {
      if (!message || typeof message !== 'object') return false;
      const m = message as { studentDecision?: string };
      return m.studentDecision === 'adopt' || m.studentDecision === 'keep';
    }) as {
    studentDecision?: 'adopt' | 'keep';
    studentDecisionReason?: string;
    decisionLatencyMs?: number;
    roundsBeforeDecision?: number;
    decisionAt?: string;
    convergenceSuggestionAt?: string;
  } | null;

  if (!decisionMessage?.studentDecision) {
    return {
      decision: null,
      reason: null,
      latencyMs: null,
      rounds: null,
      decisionAt: null,
      convergenceAt: null,
    };
  }

  return {
    decision: decisionMessage.studentDecision,
    reason: typeof decisionMessage.studentDecisionReason === 'string' ? decisionMessage.studentDecisionReason : null,
    latencyMs: typeof decisionMessage.decisionLatencyMs === 'number' ? decisionMessage.decisionLatencyMs : null,
    rounds: typeof decisionMessage.roundsBeforeDecision === 'number' ? decisionMessage.roundsBeforeDecision : null,
    decisionAt: typeof decisionMessage.decisionAt === 'string' ? decisionMessage.decisionAt : null,
    convergenceAt:
      typeof decisionMessage.convergenceSuggestionAt === 'string' ? decisionMessage.convergenceSuggestionAt : null,
  };
}

function formatLatency(latencyMs: number | null, t: TFunction): string {
  if (latencyMs === null || latencyMs < 0) {
    return t('submissions:teacher.submissionView.sparring.notAvailable');
  }

  if (latencyMs < 1000) {
    return t('submissions:teacher.submissionView.sparring.latencyMilliseconds', { value: latencyMs });
  }

  if (latencyMs < 60000) {
    return t('submissions:teacher.submissionView.sparring.latencySeconds', {
      value: Number((latencyMs / 1000).toFixed(1)),
    });
  }

  return t('submissions:teacher.submissionView.sparring.latencyMinutesSeconds', {
    minutes: Math.floor(latencyMs / 60000),
    seconds: Math.round((latencyMs % 60000) / 1000),
  });
}

function SparringInsightsCard({
  decision,
  reason,
  latencyMs,
  decisionAt,
  t,
}: {
  decision: 'adopt' | 'keep' | null;
  reason: string | null;
  latencyMs: number | null;
  decisionAt: string | null;
  t: TFunction;
}) {
  const decisionLabel =
    decision === 'adopt'
      ? t('submissions:teacher.submissionView.sparring.decisionAdopt')
      : decision === 'keep'
        ? t('submissions:teacher.submissionView.sparring.decisionKeep')
        : t('submissions:teacher.submissionView.sparring.notAvailable');

  return (
    <section className="rounded-2xl bg-muted/30 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E07A5F]/15 text-[#D2691E]">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            {t('submissions:teacher.submissionView.sparring.title')}
          </h3>
        </div>
        <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
          {decisionLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-background/85 px-3 py-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('submissions:teacher.submissionView.sparring.latencyLabel')}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatLatency(latencyMs, t)}</p>
          
        </div>
        <div className="rounded-xl bg-background/85 px-3 py-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('submissions:teacher.submissionView.sparring.decisionAtLabel')}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock3 className="h-3.5 w-3.5 text-[#E07A5F]" />
            <span>{decisionAt || t('submissions:teacher.submissionView.sparring.notAvailable')}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-background/85 px-3 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <PencilLine className="h-3.5 w-3.5 text-[#E07A5F]" />
          {t('submissions:teacher.submissionView.sparring.reasonLabel')}
        </div>
        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
          {reason || t('submissions:teacher.submissionView.sparring.notAvailable')}
        </p>
      </div>
    </section>
  );
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
  const rubricCriteria = extractRubricCriteria(rawSubmission.assignmentArea.rubric.criteria);
  const rawAiFeedbackComments = await listSubmissionAiFeedbackComments(submissionId, teacher.id);
  const aiFeedbackComments: SubmissionAiFeedbackCommentView[] = rawAiFeedbackComments.map((comment) => ({
    id: comment.id,
    annotationId: comment.annotationId,
    submissionId: comment.submissionId,
    teacherId: comment.teacherId,
    teacherName: comment.teacher.name,
    targetType: comment.targetType,
    targetId: comment.targetId,
    quote: comment.quote,
    startOffset: comment.startOffset,
    endOffset: comment.endOffset,
    comment: comment.comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }));
  const parsedHumanCriteriaScores = HumanCriteriaScoreSchema.safeParse(rawSubmission.humanCriteriaScores);
  const normalizedSparringDecision =
    rawSubmission.sparringDecision === 'adopt' || rawSubmission.sparringDecision === 'keep'
      ? rawSubmission.sparringDecision
      : null;
  const chatHistorySparringFallback = extractSparringFromChatHistory(rawSubmission.aiAnalysisResult);

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
      humanScore: rawSubmission.humanScore ?? null,
      humanCriteriaScores: parsedHumanCriteriaScores.success ? parsedHumanCriteriaScores.data : [],
      humanRaterId: rawSubmission.humanRaterId ?? null,
      humanRatedAt: rawSubmission.humanRatedAt?.toISOString() ?? null,
      formattedHumanRatedAt: rawSubmission.humanRatedAt
        ? formatDateForDisplay(rawSubmission.humanRatedAt)
        : null,
      rubricCriteria,
      aiAnalysisResult: rawSubmission.aiAnalysisResult,
      usedContext: rawSubmission.usedContext ?? null, // Feature 004
      thinkingProcess: rawSubmission.thinkingProcess ?? null, // Feature 012: AI thinking process
      thoughtSummary: rawSubmission.thoughtSummary ?? null, // Legacy field for compatibility
      gradingRationale: rawSubmission.gradingRationale ?? null, // Feature 012: AI grading rationale
      sparringDecision: normalizedSparringDecision ?? chatHistorySparringFallback.decision,
      sparringDecisionReason: rawSubmission.sparringDecisionReason ?? chatHistorySparringFallback.reason,
      sparringDecisionAt: rawSubmission.sparringDecisionAt
        ? formatDateForDisplay(rawSubmission.sparringDecisionAt)
        : chatHistorySparringFallback.decisionAt,
      sparringConvergenceShownAt: rawSubmission.sparringConvergenceShownAt
        ? formatDateForDisplay(rawSubmission.sparringConvergenceShownAt)
        : chatHistorySparringFallback.convergenceAt,
      sparringDecisionLatencyMs: rawSubmission.sparringDecisionLatencyMs ?? chatHistorySparringFallback.latencyMs,
      sparringRoundsBeforeDecision: rawSubmission.sparringRoundsBeforeDecision ?? chatHistorySparringFallback.rounds,
      aiFeedbackComments,
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
  const parsedForm = TeacherReviewSchema.safeParse({
    teacherFeedback: formData.get('teacherFeedback')?.toString(),
  });

  if (!parsedForm.success) {
    return { success: false, errorKey: 'invalidScore' };
  }

  try {
    // Import the update function
    const { updateSubmission } = await import('@/services/submission.server');

    // Verify teacher has permission to update this submission
    const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
    if (!submission) {
      return { success: false, errorKey: 'notFoundOrUnauthorized' };
    }

    const rubricCriteria = extractRubricCriteria(submission.assignmentArea.rubric.criteria);
    if (rubricCriteria.length === 0) {
      return { success: false, errorKey: 'saveFailed' };
    }

    const feedbackValue = parsedForm.data.teacherFeedback?.trim() ?? '';
    const criterionScoresById = new Map<string, number>();
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('criterionScore:')) continue;
      const criteriaId = key.replace('criterionScore:', '');
      const rawValue = typeof value === 'string' ? value.trim() : '';
      if (!rawValue) continue;

      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return { success: false, errorKey: 'invalidScore' };
      }
      criterionScoresById.set(criteriaId, numericValue);
    }

    const hasIncompleteCriteria = rubricCriteria.some((criterion) => !criterionScoresById.has(criterion.criteriaId));
    if (hasIncompleteCriteria) {
      return { success: false, errorKey: 'incompleteCriteriaScores' };
    }

    const humanCriteriaScores = rubricCriteria.map((criterion) => {
      const score = criterionScoresById.get(criterion.criteriaId) ?? NaN;
      if (!Number.isFinite(score) || !Number.isInteger(score) || score < 1 || score > criterion.maxScore) {
        throw new Error(`INVALID_CRITERION_SCORE:${criterion.criteriaId}`);
      }

      return {
        criteriaId: criterion.criteriaId,
        score,
        maxScore: criterion.maxScore,
      };
    });

    const humanScore = humanCriteriaScores.reduce((sum, item) => sum + item.score, 0);
    const maxScore = humanCriteriaScores.reduce((sum, item) => sum + item.maxScore, 0);
    const normalizedScore =
      maxScore > 0 ? Math.max(0, Math.min(100, Math.round((humanScore / maxScore) * 10000) / 100)) : null;
    const finalScore = Number.isFinite(humanScore) ? Math.round(humanScore) : null;

    // Update the submission with teacher feedback
    await updateSubmission(submissionId, {
      teacherFeedback: feedbackValue || null,
      humanScore,
      humanCriteriaScores,
      humanRaterId: teacher.id,
      humanRatedAt: new Date(),
      finalScore,
      normalizedScore,
      status: 'GRADED',
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating teacher feedback:', error);
    if (error instanceof Error && error.message.startsWith('INVALID_CRITERION_SCORE:')) {
      return { success: false, errorKey: 'invalidScore' };
    }
    return { success: false, errorKey: 'saveFailed' };
  }
}

export default function TeacherSubmissionView() {
  const { submission } = useLoaderData<typeof loader>();
  const params = useParams();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();
  const { t } = useTranslation(['submissions', 'common']);

  // Local state for teacher feedback
  const [feedback, setFeedback] = useState(submission.grading.teacherFeedback || '');
  const [criterionScores, setCriterionScores] = useState<Record<string, string>>(() => {
    const scores: Record<string, string> = {};
    for (const criterion of submission.grading.rubricCriteria) {
      const existing = submission.grading.humanCriteriaScores.find(
        (item) => item.criteriaId === criterion.criteriaId
      );
      scores[criterion.criteriaId] = existing ? String(existing.score) : '';
    }
    return scores;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf'); // Mobile tab navigation
  
  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastFeedbackToastRef = useRef<string | null>(null);

  // Reset submitting state when action completes
  useEffect(() => {
    if (!actionData) return;

    setIsSubmitting(false);

    const toastKey = actionData.success
      ? 'feedback:success'
      : `feedback:error:${actionData.errorKey || actionData.error || 'unknown'}`;

    if (lastFeedbackToastRef.current === toastKey) {
      return;
    }

    lastFeedbackToastRef.current = toastKey;

    if (actionData.success) {
      toast.success(t('submissions:teacher.submissionView.feedback.saveSuccess'));
      return;
    }

    const message = actionData.error
      ? actionData.error
      : actionData.errorKey
        ? t(`submissions:teacher.submissionView.feedback.errors.${actionData.errorKey}`)
        : t('submissions:teacher.submissionView.feedback.errors.saveFailed');

    toast.error(message);
  }, [actionData, t]);

  // Handle deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${params.submissionId}/delete`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t('submissions:teacher.submissionView.delete.success'));
        // Navigate back to assignment submissions list
        navigate(submission.navigation.backUrl);
      } else {
        toast.error(data.error || t('submissions:teacher.submissionView.delete.failed'));
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error(t('submissions:teacher.submissionView.delete.failed'));
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Full screen layout - bypasses parent container constraints
  const rubricMaxScore = submission.grading.rubricCriteria.reduce(
    (sum, criterion) => sum + criterion.maxScore,
    0
  );

  const computedHumanScore = submission.grading.rubricCriteria.reduce((sum, criterion) => {
    const raw = criterionScores[criterion.criteriaId];
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);

  const hasAllCriterionScores = submission.grading.rubricCriteria.every((criterion) => {
    const raw = criterionScores[criterion.criteriaId];
    return raw !== undefined && raw !== '';
  });

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
              {t('submissions:history')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs lg:text-sm"
            >
              <Trash2 className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
              {t('submissions:teacher.submissionView.delete.button')}
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
                    <span className="text-muted-foreground">{t('submissions:teacher.submissionView.pdf.loading')}</span>
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
              <p className="text-muted-foreground">{t('submissions:teacher.submissionView.pdf.noFile')}</p>
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
                submissionId={params.submissionId}
                result={submission.grading.aiAnalysisResult}
                normalizedScore={submission.grading.normalizedScore}
                thinkingProcess={submission.grading.thinkingProcess}
                thoughtSummary={submission.grading.thoughtSummary}
                gradingRationale={submission.grading.gradingRationale}
                studentName={submission.student.name}
                studentPicture={submission.student.picture}
                aiFeedbackComments={submission.grading.aiFeedbackComments}
              />
            )}

            <SparringInsightsCard
              decision={submission.grading.sparringDecision}
              reason={submission.grading.sparringDecisionReason}
              latencyMs={submission.grading.sparringDecisionLatencyMs}
              decisionAt={submission.grading.sparringDecisionAt}
              t={t}
            />

            {/* Teacher Feedback Section */}
            <div className="rounded-2xl bg-muted/30 p-4 sm:p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#E07A5F]" />
                  <h3 className="text-lg font-semibold">{t('submissions:teacher.submissionView.feedback.title')}</h3>
                </div>

                <Form method="post" onSubmit={() => setIsSubmitting(true)}>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-background/90 px-4 py-3 shadow-sm">
                      <Label className="text-sm text-muted-foreground">
                        {t('submissions:teacher.submissionView.feedback.criteriaScoringTitle')}
                      </Label>
                      <div className="mt-2 divide-y divide-border/40">
                        {submission.grading.rubricCriteria.map((criterion) => (
                          <div key={criterion.criteriaId} className="py-3 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{criterion.name}</p>
                                {criterion.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                    {criterion.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t('submissions:teacher.submissionView.feedback.maxScoreHint', {
                                    maxScore: criterion.maxScore,
                                  })}
                                </p>
                              </div>
                              <Select
                                name={`criterionScore:${criterion.criteriaId}`}
                                value={criterionScores[criterion.criteriaId] ?? ''}
                                onValueChange={(value) => {
                                  setCriterionScores((prev) => ({
                                    ...prev,
                                    [criterion.criteriaId]: value,
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder={t('submissions:teacher.submissionView.feedback.levelPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: Math.floor(criterion.maxScore) }, (_, idx) => idx + 1).map((level) => (
                                    <SelectItem key={`${criterion.criteriaId}-${level}`} value={String(level)}>
                                      {t('submissions:teacher.submissionView.feedback.levelOption', { level })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {criterion.levels.length > 0 && (
                              <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
                                
                                {[...criterion.levels]
                                  .sort((a, b) => b.score - a.score)
                                  .map((level) => {
                                    const selected = Number(criterionScores[criterion.criteriaId]) === level.score;
                                    return (
                                      <div
                                        key={`${criterion.criteriaId}-desc-${level.score}`}
                                        className={selected
                                          ? 'text-xs text-[#8C3218] font-semibold bg-[#FFE1D6] rounded-md px-2 py-1'
                                          : 'text-xs text-muted-foreground px-2 py-1'
                                        }
                                      >
                                        <span className="inline-block min-w-12">{t('submissions:teacher.submissionView.feedback.levelOption', { level: level.score })}</span>
                                        <span>{level.description}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-background/90 px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">
                        {t('submissions:teacher.submissionView.feedback.computedScore', {
                          score: Math.round(computedHumanScore),
                          maxScore: rubricMaxScore,
                        })}
                      </p>
                      {submission.grading.formattedHumanRatedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('submissions:teacher.submissionView.feedback.reviewedMeta', {
                            score: submission.grading.humanScore,
                            reviewedAt: submission.grading.formattedHumanRatedAt,
                          })}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherFeedback" className="text-sm text-muted-foreground">
                        {t('submissions:teacher.submissionView.feedback.label')}
                      </Label>
                      <Textarea
                        id="teacherFeedback"
                        name="teacherFeedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={t('submissions:teacher.submissionView.feedback.placeholder')}
                        className="min-h-[120px] resize-none bg-background"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !hasAllCriterionScores}
                      className="w-full bg-[#E07A5F] text-white hover:bg-[#D2691E]"
                    >
                      {isSubmitting
                        ? t('submissions:teacher.submissionView.feedback.saving')
                        : t('submissions:teacher.submissionView.feedback.save')}
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
              {t('submissions:teacher.submissionView.tabs.pdf')}
            </TabsTrigger>
            <TabsTrigger
              value="grading"
              className="rounded-none border-0 text-xs sm:text-sm text-muted-foreground data-[state=active]:text-[#E07A5F] data-[state=active]:font-semibold data-[state=active]:bg-[#E07A5F]/15 data-[state=active]:shadow-none"
            >
              {t('submissions:teacher.submissionView.tabs.grading')}
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
                    <span className="text-muted-foreground">{t('submissions:teacher.submissionView.pdf.loading')}</span>
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
              <p className="text-muted-foreground">{t('submissions:teacher.submissionView.pdf.noFile')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grading" className="flex-1 overflow-y-auto m-0 p-4">
          <div className="space-y-6">
            {/* AI Analysis Details */}
            {submission.grading.aiAnalysisResult && (
              <GradingResultDisplay
                submissionId={params.submissionId}
                result={submission.grading.aiAnalysisResult}
                normalizedScore={submission.grading.normalizedScore}
                thinkingProcess={submission.grading.thinkingProcess}
                thoughtSummary={submission.grading.thoughtSummary}
                gradingRationale={submission.grading.gradingRationale}
                studentName={submission.student.name}
                studentPicture={submission.student.picture}
                aiFeedbackComments={submission.grading.aiFeedbackComments}
              />
            )}

            <SparringInsightsCard
              decision={submission.grading.sparringDecision}
              reason={submission.grading.sparringDecisionReason}
              latencyMs={submission.grading.sparringDecisionLatencyMs}
              decisionAt={submission.grading.sparringDecisionAt}
              t={t}
            />

            {/* Teacher Feedback Section */}
            <div className="rounded-2xl bg-muted/30 p-4 sm:p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#E07A5F]" />
                  <h3 className="text-lg font-semibold">{t('submissions:teacher.submissionView.feedback.title')}</h3>
                </div>

                <Form method="post" onSubmit={() => setIsSubmitting(true)}>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-background/90 px-4 py-3 shadow-sm">
                      <Label className="text-sm text-muted-foreground">
                        {t('submissions:teacher.submissionView.feedback.criteriaScoringTitle')}
                      </Label>
                      <div className="mt-2 divide-y divide-border/40">
                        {submission.grading.rubricCriteria.map((criterion) => (
                          <div key={criterion.criteriaId} className="py-3 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{criterion.name}</p>
                                {criterion.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                    {criterion.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t('submissions:teacher.submissionView.feedback.maxScoreHint', {
                                    maxScore: criterion.maxScore,
                                  })}
                                </p>
                              </div>
                              <Select
                                name={`criterionScore:${criterion.criteriaId}`}
                                value={criterionScores[criterion.criteriaId] ?? ''}
                                onValueChange={(value) => {
                                  setCriterionScores((prev) => ({
                                    ...prev,
                                    [criterion.criteriaId]: value,
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder={t('submissions:teacher.submissionView.feedback.levelPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: Math.floor(criterion.maxScore) }, (_, idx) => idx + 1).map((level) => (
                                    <SelectItem key={`${criterion.criteriaId}-mobile-${level}`} value={String(level)}>
                                      {t('submissions:teacher.submissionView.feedback.levelOption', { level })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {criterion.levels.length > 0 && (
                              <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {t('submissions:teacher.submissionView.feedback.fullStandardsLabel', '完整評分標準')}
                                </p>
                                {[...criterion.levels]
                                  .sort((a, b) => b.score - a.score)
                                  .map((level) => {
                                    const selected = Number(criterionScores[criterion.criteriaId]) === level.score;
                                    return (
                                      <div
                                        key={`${criterion.criteriaId}-mobile-desc-${level.score}`}
                                        className={selected
                                          ? 'text-xs text-[#8C3218] font-semibold bg-[#FFE1D6] rounded-md px-2 py-1'
                                          : 'text-xs text-muted-foreground px-2 py-1'
                                        }
                                      >
                                        <span className="inline-block min-w-12">{t('submissions:teacher.submissionView.feedback.levelOption', { level: level.score })}</span>
                                        <span>{level.description}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-background/90 px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">
                        {t('submissions:teacher.submissionView.feedback.computedScore', {
                          score: Math.round(computedHumanScore),
                          maxScore: rubricMaxScore,
                        })}
                      </p>
                      {submission.grading.formattedHumanRatedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('submissions:teacher.submissionView.feedback.reviewedMeta', {
                            score: submission.grading.humanScore,
                            reviewedAt: submission.grading.formattedHumanRatedAt,
                          })}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherFeedback-mobile" className="text-sm text-muted-foreground">
                        {t('submissions:teacher.submissionView.feedback.label')}
                      </Label>
                      <Textarea
                        id="teacherFeedback-mobile"
                        name="teacherFeedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={t('submissions:teacher.submissionView.feedback.placeholder')}
                        className="min-h-[120px] resize-none bg-background"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !hasAllCriterionScores}
                      className="w-full bg-[#E07A5F] text-white hover:bg-[#D2691E]"
                    >
                      {isSubmitting
                        ? t('submissions:teacher.submissionView.feedback.saving')
                        : t('submissions:teacher.submissionView.feedback.save')}
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
            <DialogTitle>{t('submissions:teacher.submissionView.delete.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('submissions:teacher.submissionView.delete.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? t('submissions:teacher.submissionView.delete.deleting')
                : t('submissions:teacher.submissionView.delete.confirm')}
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
              {t('common:errors.404.submission')}
            </p>
          </div>
          <a
            href="/teacher"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
          >
            <Home className="h-4 w-4" />
            {t('common:returnHome')}
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
            {t('common:errors.generic.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('common:errors.generic.submission')}
          </p>
        </div>
        <a
          href="/teacher"
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          {t('common:returnHome')}
        </a>
      </div>
    </div>
  );
}
