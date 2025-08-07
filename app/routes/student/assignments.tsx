import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Calendar, Clock, CheckCircle, AlertCircle, BookOpen, User, FileText } from 'lucide-react';

import { requireStudent } from '@/services/auth.server';
import { getStudentAssignments, type StudentAssignmentInfo } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LoaderData {
  student: { id: string; email: string; role: string };
  assignments: StudentAssignmentInfo[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);
  const assignments = await getStudentAssignments(student.id);
  return { student, assignments };
}

export default function StudentAssignments() {
  const { student, assignments } = useLoaderData<typeof loader>();

  // Categorize assignments
  const categorizedAssignments = assignments.reduce((acc, assignment) => {
    const hasSubmission = assignment.submissions.some(sub => sub.studentId === student.id);
    
    if (hasSubmission) {
      const submission = assignment.submissions.find(sub => sub.studentId === student.id);
      if (submission?.status === 'GRADED') {
        acc.graded.push(assignment);
      } else {
        acc.submitted.push(assignment);
      }
    } else {
      const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
      if (isOverdue) {
        acc.overdue.push(assignment);
      } else {
        acc.pending.push(assignment);
      }
    }
    return acc;
  }, {
    pending: [] as StudentAssignmentInfo[],
    submitted: [] as StudentAssignmentInfo[],
    graded: [] as StudentAssignmentInfo[],
    overdue: [] as StudentAssignmentInfo[]
  });

  const getStatusBadge = (assignment: StudentAssignmentInfo) => {
    const hasSubmission = assignment.submissions.some(sub => sub.studentId === student.id);
    
    if (hasSubmission) {
      const submission = assignment.submissions.find(sub => sub.studentId === student.id);
      if (submission?.status === 'GRADED') {
        return <Badge variant="default">Graded</Badge>;
      }
      return <Badge variant="secondary">Submitted</Badge>;
    }
    
    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return 'No due date';
    
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const AssignmentCard = ({ assignment }: { assignment: StudentAssignmentInfo }) => {
    const hasSubmission = assignment.submissions.some(sub => sub.studentId === student.id);
    const submission = assignment.submissions.find(sub => sub.studentId === student.id);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.name}</h3>
              {assignment.description && (
                <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>
              )}
            </div>
            <div className="ml-4">
              {getStatusBadge(assignment)}
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="w-4 h-4 mr-2" />
              <span>{assignment.course.name}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>Instructor: {assignment.course.teacher.email}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDueDate(assignment.dueDate)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-2" />
              <span>Rubric: {assignment.rubric.name}</span>
            </div>
          </div>

          {submission && submission.finalScore !== null && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Final Score</span>
                <span className="text-lg font-bold text-blue-900">{submission.finalScore}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {!hasSubmission ? (
              <Button asChild>
                <Link to={`/student/assignments/${assignment.id}/submit`}>
                  Submit Assignment
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to={`/student/assignments/${assignment.id}/submit`}>
                  View Submission
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader 
        title="All Assignments" 
        subtitle={`${assignments.length} assignments available`}
        actions={
          <Button asChild variant="outline" >
            <Link to="/student/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments available</h3>
              <p className="mt-1 text-sm text-gray-500">Check back later for new assignments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Assignments */}
            {categorizedAssignments.pending.length > 0 && (
              <section>
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-orange-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pending ({categorizedAssignments.pending.length})
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categorizedAssignments.pending.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </section>
            )}

            {/* Overdue Assignments */}
            {categorizedAssignments.overdue.length > 0 && (
              <section>
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Overdue ({categorizedAssignments.overdue.length})
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categorizedAssignments.overdue.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </section>
            )}

            {/* Submitted Assignments */}
            {categorizedAssignments.submitted.length > 0 && (
              <section>
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-blue-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Submitted ({categorizedAssignments.submitted.length})
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categorizedAssignments.submitted.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </section>
            )}

            {/* Graded Assignments */}
            {categorizedAssignments.graded.length > 0 && (
              <section>
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Graded ({categorizedAssignments.graded.length})
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categorizedAssignments.graded.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 