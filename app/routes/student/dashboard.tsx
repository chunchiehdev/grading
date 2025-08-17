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

interface LoaderData {
  student: { id: string; email: string; role: string };
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
        <Link to="/student/courses">My Courses</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/student/assignments">View All Assignments</Link>
      </Button>
      <Button asChild>
        <Link to="/student/submissions">My Submissions</Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Student Dashboard"
        subtitle={`Welcome back, ${student.email.split('@')[0]}`}
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Pending" value={pendingAssignments.length} icon={Clock} variant="transparent" />
          <StatsCard title="Submitted" value={submissions.length} icon={CheckCircle} variant="transparent" />
          <StatsCard
            title="Graded"
            value={submissions.filter((sub) => sub.status === 'GRADED').length}
            icon={BarChart3}
            variant="transparent"
          />
          <StatsCard
            title="Avg Score"
            value={averageScore !== null ? averageScore : '--'}
            icon={Zap}
            variant="transparent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming deadlines</h3>
                  <p className="mt-1 text-sm text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{assignment.name}</h3>
                        <p className="text-sm text-gray-600">{assignment.course.name}</p>
                        <p className="text-xs text-gray-500">Teacher: {assignment.course.teacher.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">Due {assignment.formattedDueDate}</p>
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
                <CardTitle>Recent Submissions</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/submissions">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start by submitting your first assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.slice(0, 5).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{submission.assignmentArea.name}</h3>
                        <p className="text-sm text-gray-600">{submission.assignmentArea.course.name}</p>
                        <p className="text-xs text-gray-500">Submitted {submission.formattedUploadedDate}</p>
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
                          <p className="text-sm font-medium text-gray-900 mt-1">Score: {submission.finalScore}</p>
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
