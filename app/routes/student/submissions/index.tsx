import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useNavigate } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export async function loader({ request }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const submissions = await getSubmissionsByStudentId(student.id);
  return { student, submissions };
}

export default function StudentSubmissions() {
  const { submissions } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['common', 'submissions']);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader>
        <div className="flex items-center justify-start pt-2">
          <Button asChild variant="outline">
            <Link to="/student/dashboard">{t('common:back')}</Link>
          </Button>
        </div>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 pb-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t('submissions:history')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!submissions || submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('submissions:teacherComments.empty')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('submissions:table.assignment')}</TableHead>
                    <TableHead>{t('submissions:table.course')}</TableHead>
                    <TableHead>{t('submissions:table.submittedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow 
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/student/submissions/${s.id}`)}
                    >
                      <TableCell className="font-medium">{s.assignmentArea?.name}</TableCell>
                      <TableCell>{s.assignmentArea?.course?.name}</TableCell>
                      <TableCell>{s.uploadedAt ? new Date(s.uploadedAt).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
