import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionById } from '@/services/submission.server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Submission Detail</h1>
        <Button asChild variant="outline">
          <Link to="/student/submissions">Back to Submissions</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{a.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">Course: {a.course.name}</div>
          {a.dueDate && (
            <div className="text-sm text-muted-foreground">Due: {new Date(a.dueDate).toLocaleString()}</div>
          )}
          <div className="text-sm">Submitted file: {submission.filePath}</div>
          <div className="text-sm">Status: {submission.status}</div>
          <div className="text-sm">Rubric: {a.rubric.name}</div>
          <div className="pt-4 text-sm text-muted-foreground">
            Grading result will appear once processing completes.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
