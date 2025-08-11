import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export async function loader({ request }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const submissions = await getSubmissionsByStudentId(student.id);
  return { student, submissions };
}

export default function StudentSubmissions() {
  const { submissions } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Submissions</h1>
        <Button asChild variant="outline">
          <Link to="/student/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {(!submissions || submissions.length === 0) ? (
            <p className="text-sm text-muted-foreground">You have not made any submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.assignmentArea?.name}</TableCell>
                    <TableCell>{s.assignmentArea?.course?.name}</TableCell>
                    <TableCell>{s.uploadedAt ? new Date(s.uploadedAt).toLocaleString() : '-'}</TableCell>
                    <TableCell>{s.status || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/student/submissions/${s.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

