import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionById } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const a = submission.assignmentArea;

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
      <PageHeader
        title={a.name}
        actions={
          <Button asChild variant="outline">
            <Link to="/student/submissions">Back to Submissions</Link>
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Assignment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">Course: {a.course.name}</div>
                {a.dueDate && (
                  <div className="text-sm text-muted-foreground">Due: {new Date(a.dueDate).toLocaleString()}</div>
                )}
                {a.description && (
                  <div className="text-sm text-muted-foreground">{a.description}</div>
                )}
                <div className="pt-2 text-sm">Submitted file: {submission.filePath}</div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Grading Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {renderStatus(submission.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Score</span>
                  <span>{submission.finalScore ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{new Date(submission.uploadedAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Teacher Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.teacherFeedback ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{submission.teacherFeedback}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No teacher comments yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>AI Analysis Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.aiAnalysisResult ? (
                  <pre className="text-xs text-foreground bg-muted p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(submission.aiAnalysisResult, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Grading is in progress.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
