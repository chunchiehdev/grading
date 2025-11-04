import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form } from 'react-router';
import { Save } from 'lucide-react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionByIdForTeacher } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { ContextTransparency } from '@/components/grading/ContextTransparency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import type { TeacherInfo, TeacherSubmissionView } from '@/types/teacher';

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
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('teacher');

  return (
    <div className="bg-background">
      
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <StudentInfoCard student={submission.student} />
            <AssignmentInfoCard assignment={submission.assignment} grading={submission.grading} />
            <AIAnalysisCard
              result={submission.grading.aiAnalysisResult}
              normalizedScore={submission.grading.normalizedScore}
              usedContext={submission.grading.usedContext}
            />
          </div>

          <div className="md:col-span-1 space-y-6">
            <GradingSummaryCard grading={submission.grading} />
            <FeedbackFormCard defaultFeedback={submission.grading.teacherFeedback} actionData={actionData} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Sub-components - extracted to eliminate Card structure duplication
// ============================================================================

function StudentInfoCard({ student }: { student: TeacherSubmissionView['student'] }) {
  const { t } = useTranslation('teacher');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('studentInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={student.picture ?? undefined} alt={student.name} />
            <AvatarFallback className="bg-primary/10 text-primary">{student.initial}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium text-foreground">{student.name}</h3>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentInfoCard({
  assignment,
  grading,
}: {
  assignment: TeacherSubmissionView['assignment'];
  grading: TeacherSubmissionView['grading'];
}) {
  const { t } = useTranslation('teacher');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('assignmentInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {t('course')}: {assignment.course.name}
        </div>
        {assignment.formattedDueDate && (
          <div className="text-sm text-muted-foreground">
            {t('dueDate')}: {assignment.formattedDueDate}
          </div>
        )}
        {assignment.description && <div className="text-sm text-muted-foreground">{assignment.description}</div>}
        {grading.filePath && (
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/files/${grading.filePath}/download`} target="_blank" rel="noopener noreferrer">
                {t('downloadFile')}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIAnalysisCard({
  result,
  normalizedScore,
  usedContext,
}: {
  result: any | null;
  normalizedScore?: number | null;
  usedContext?: any | null;
}) {
  const { t } = useTranslation('teacher');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('aiAnalysis')}</CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-4">
            {/* Feature 004: Show context transparency first */}
            {usedContext && <ContextTransparency usedContext={usedContext} />}

            {/* AI grading results */}
            <GradingResultDisplay result={result} normalizedScore={normalizedScore} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('aiAnalysisInProgress')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function GradingSummaryCard({ grading }: { grading: TeacherSubmissionView['grading'] }) {
  const { t } = useTranslation('teacher');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('gradingSummary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('score')}</span>
          <span className="font-medium">
            {grading.normalizedScore !== null ? `${grading.normalizedScore.toFixed(1)} / 100` : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('submittedAt')}</span>
          <span>{grading.formattedUploadedAt || grading.uploadedAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackFormCard({
  defaultFeedback,
  actionData,
}: {
  defaultFeedback: string | null;
  actionData: ActionData | undefined;
}) {
  const { t } = useTranslation('teacher');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('provideFeedback')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacherFeedback">{t('feedbackLabel')}</Label>
            <Textarea
              id="teacherFeedback"
              name="teacherFeedback"
              rows={6}
              defaultValue={defaultFeedback || ''}
              placeholder={t('feedbackPlaceholder')}
              className="bg-background border-border"
            />
          </div>

          {actionData?.error && (
            <Alert variant="destructive">
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          )}

          {actionData?.success && (
            <Alert>
              <AlertDescription>{t('feedbackSaved')}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {t('saveFeedback')}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}
