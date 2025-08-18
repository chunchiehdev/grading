import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Clock, CheckCircle, BarChart3, Zap, FileText, ArrowRight } from 'lucide-react';

import { requireStudent } from '@/services/auth.server';
import {
  getStudentAssignments,
  getStudentSubmissions,
  type StudentAssignmentInfo,
  type SubmissionInfo,
} from '@/services/submission.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';

import { useTranslation } from 'react-i18next';

interface LoaderData {
  student: { id: string; email: string; role: string, name: string };
  assignments: (StudentAssignmentInfo & { formattedDueDate?: string })[];
  submissions: (SubmissionInfo & { formattedUploadedDate: string })[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);
  const [assignmentsRaw, submissionsRaw] = await Promise.all([
    getStudentAssignments(student.id),
    getStudentSubmissions(student.id),
  ]);

  const assignments = assignmentsRaw.map((a) => ({
    ...a,
    formattedDueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-CA') : undefined,
  }));

  const submissions = submissionsRaw.map((s) => ({
    ...s,
    formattedUploadedDate: new Date(s.uploadedAt).toLocaleDateString('en-CA'),
  }));

  return { student, assignments, submissions };
}

export default function StudentDashboard() {
  const { student, assignments, submissions } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['course', 'dashboard'])
  
  // Separate assignments into different categories
  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.submissions.some((sub) => sub.studentId === student.id)
  );

  // Get upcoming deadlines
  const upcomingDeadlines = pendingAssignments
    .filter((assignment) => assignment.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  // Calculate average score
  const gradedSubmissions = submissions.filter((sub) => sub.finalScore !== null);
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((acc, sub) => acc + sub.finalScore!, 0) / gradedSubmissions.length)
      : null;

  const headerActions = (
    <>
      <Button asChild variant="outline">
        <Link to="/student/courses">{t('course:courses')}</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/student/assignments">{t('course:assignments')}</Link>
      </Button>
      <Button asChild>
        <Link to="/student/submissions">{t('course:assignment.submissions')}</Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title={t('dashboard:title')}
        subtitle={`${t('dashboard:welcome')}, ${student.name}`}
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard title={t('dashboard:assignmentsPending')} value={pendingAssignments.length} icon={Clock} variant="transparent" />
          <StatsCard title={t('dashboard:submitted')} value={submissions.length} icon={CheckCircle} variant="transparent" />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:upcomingDeadlines')}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">{t('dashboard:emptyState.noUpcomingDeadlines')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('dashboard:emptyState.allCaughtUp')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-foreground">{assignment.name}</h3>
                        <p className="text-sm text-muted-foreground">{assignment.course.name}</p>
                        <p className="text-xs text-muted-foreground">Teacher: {assignment.course.teacher.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-destructive">Due {assignment.formattedDueDate}</p>
                        <Button asChild size="sm" variant="ghost" className="mt-1">
                          <Link to={`/student/assignments/${assignment.id}/submit`}>
                            Submit <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('dashboard:recentSubmissions')}</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/submissions">{t('dashboard:viewSubmissions')}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">No submissions yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start by submitting your first assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.slice(0, 5).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-foreground">{submission.assignmentArea.name}</h3>
                        <p className="text-sm text-muted-foreground">{submission.assignmentArea.course.name}</p>
                        <p className="text-xs text-muted-foreground">Submitted {submission.formattedUploadedDate}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            submission.status === 'GRADED'
                              ? 'default'
                              : submission.status === 'ANALYZED'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {submission.status.toLowerCase()}
                        </Badge>
                        {submission.finalScore !== null && (
                          <p className="text-sm font-medium text-foreground mt-1">Score: {submission.finalScore}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
