import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionByIdForTeacher } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  submission: any;
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

  const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);

  if (!submission) {
    throw new Response('Submission not found', { status: 404 });
  }

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
  const { t } = useTranslation(['submissions', 'teacher']);


  const a = submission.assignmentArea;

  const headerActions = (
    <Button asChild variant="outline">
      <Link to={`/teacher/courses/${a.course.id}/assignments/${a.id}/submissions`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('teacher:backToSubmissions')}
      </Link>
    </Button>
  );

  return (
    <div className="bg-background">
      <PageHeader
        title={`${t('teacher:submissionReview')} - ${submission.student?.name || 'Unknown Student'}`}
        subtitle={`${a.name} - ${a.course.name}`}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('teacher:studentInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {submission.student?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {submission.student?.name || 'Unknown Student'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {submission.student?.email || 'No email'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('submissions:assignmentInfo.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('submissions:assignmentInfo.course')}: {a.course.name}
                </div>
                {a.dueDate && (
                  <div className="text-sm text-muted-foreground">
                    {t('submissions:assignmentInfo.due')}: {new Date(a.dueDate).toLocaleString()}
                  </div>
                )}
                {a.description && (
                  <div className="text-sm text-muted-foreground">{a.description}</div>
                )}
                {submission.filePath && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={submission.filePath} target="_blank" rel="noopener noreferrer">
                        {t('teacher:downloadFile')}
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle>{t('submissions:aiAnalysis.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.aiAnalysisResult ? (
                  <GradingResultDisplay result={submission.aiAnalysisResult as any} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('submissions:aiAnalysis.inProgress')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary and Actions */}
          <div className="md:col-span-1 space-y-6">
            {/* Grading Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t('submissions:gradingSummary.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('submissions:gradingSummary.score')}</span>
                  <span className="font-medium">
                    {submission.finalScore !== null ? `${submission.finalScore} ${t('teacher:points')}` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('submissions:gradingSummary.submitted')}</span>
                  <span>{new Date(submission.uploadedAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>{t('teacher:provideFeedback')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form method="post" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherFeedback">{t('teacher:feedbackLabel')}</Label>
                    <Textarea
                      id="teacherFeedback"
                      name="teacherFeedback"
                      rows={6}
                      defaultValue={submission.teacherFeedback || ''}
                      placeholder={t('teacher:feedbackPlaceholder')}
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
                      <AlertDescription>{t('teacher:feedbackSaved')}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {t('teacher:saveFeedback')}
                  </Button>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}