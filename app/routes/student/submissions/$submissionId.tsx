import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionById } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { useTranslation } from 'react-i18next';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const submissionId = params.submissionId as string;
  const submission = await getSubmissionById(submissionId, student.id);
  if (!submission) {
    throw new Response('Submission not found', { status: 404 });
  }
  return { student, submission };
}

export default function StudentSubmissionDetail() {
  const { submission } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);
  const a = submission.assignmentArea;
  console.log('submission', submission);
  const renderStatus = (status?: string) => {
    const normalized = (status || '').toUpperCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let label = status || 'Unknown';
    switch (normalized) {
      case 'GRADED':
        variant = 'default';
        label = 'Graded';
        break;
      case 'ANALYZED':
      case 'PENDING':
        variant = 'secondary';
        label = 'Pending';
        break;
      case 'SUBMITTED':
        variant = 'outline';
        label = 'Submitted';
        break;
      case 'FAILED':
        variant = 'destructive';
        label = 'Failed';
        break;
    }
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader>
        <div className="flex items-center justify-start pt-2">
          <Button asChild variant="outline">
            <Link to="/student/submissions">{t('submissions:backToSubmissions')}</Link>
          </Button>
        </div>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('submissions:assignmentInfo.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">{t('submissions:assignmentInfo.course')}: {a.course.name}</div>
                {a.dueDate && (
                  <div className="text-sm text-muted-foreground">{t('submissions:assignmentInfo.due')}: {new Date(a.dueDate).toLocaleString()}</div>
                )}
                {a.description && <div className="text-sm text-muted-foreground">{a.description}</div>}
                {/* <div className="pt-2 text-sm">Submitted file: {submission.filePath}</div> */}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('submissions:aiAnalysis.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.aiAnalysisResult ? (
                  <GradingResultDisplay result={submission.aiAnalysisResult as any} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('submissions:aiAnalysis.inProgress')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('submissions:gradingSummary.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('submissions:gradingSummary.status')}</span>
                  {renderStatus(submission.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('submissions:gradingSummary.score')}</span>
                  <span>{submission.finalScore ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('submissions:gradingSummary.submitted')}</span>
                  <span>{new Date(submission.uploadedAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('submissions:teacherComments.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.teacherFeedback ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{submission.teacherFeedback}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('submissions:teacherComments.empty')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
