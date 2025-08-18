import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionsByStudentId } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
              <p className="text-sm text-muted-foreground">{t('submissions:teacherComments.noComments')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('submissions:table.assignment')}</TableHead>
                    <TableHead>{t('submissions:table.course')}</TableHead>
                    <TableHead>{t('submissions:table.submittedAt')}</TableHead>
                    <TableHead>{t('submissions:table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.assignmentArea?.name}</TableCell>
                      <TableCell>{s.assignmentArea?.course?.name}</TableCell>
                      <TableCell>{s.uploadedAt ? new Date(s.uploadedAt).toLocaleString() : '-'}</TableCell>
                      <TableCell>{renderStatus(s.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/student/submissions/${s.id}`}>{t('submissions:table.viewDetails')}</Link>
                        </Button>
                      </TableCell>
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
