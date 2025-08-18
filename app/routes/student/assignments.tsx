import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Calendar, Clock, CheckCircle, AlertCircle, BookOpen, User, FileText, UserPlus } from 'lucide-react';

import { requireStudent } from '@/services/auth.server';
import { getStudentAssignments, type StudentAssignmentInfo } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'node_modules/react-i18next';

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
  const { t } = useTranslation();

  // If no assignments (not enrolled in any courses), show enrollment message
  if (assignments.length === 0) {
    return (
      <div className="bg-background text-foreground">
        <PageHeader 
          title="No Assignments Available" 
          subtitle="You need to join a course to access assignments"
          actions={
            <Button asChild variant="outline">
              <Link to="/student/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          }
        />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Join a Course to Get Started
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You're not enrolled in any courses yet. Ask your teacher for an invitation code or QR code to join a course and access assignments.
                </p>
                
                <div className="bg-muted border border-border rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <h4 className="font-medium text-foreground mb-2">How to Join a Course</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Get an invitation code from your teacher</li>
                    <li>• Scan a QR code if provided</li>
                    <li>• Visit the invitation link</li>
                    <li>• Contact your teacher for assistance</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to="/student/dashboard">
                      Back to Dashboard
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/student/courses">
                      View My Courses
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Group assignments by course
  const assignmentsByCourse = assignments.reduce((acc, assignment) => {
    const courseId = assignment.course.id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: assignment.course,
        assignments: []
      };
    }
    acc[courseId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { course: StudentAssignmentInfo['course'], assignments: StudentAssignmentInfo[] }>);

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

  const AssignmentCard = ({ assignment, showCourse = true }: { assignment: StudentAssignmentInfo, showCourse?: boolean }) => {
    const hasSubmission = assignment.submissions.some(sub => sub.studentId === student.id);
    const submission = assignment.submissions.find(sub => sub.studentId === student.id);
    
    return (
      <Card className="hover:shadow-md transition-shadow bg-card text-card-foreground border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">{assignment.name}</h3>
              {assignment.description && (
                <p className="text-muted-foreground text-sm mb-3">{assignment.description}</p>
              )}
            </div>
            <div className="ml-4">
              {getStatusBadge(assignment)}
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {showCourse && (
              <>
                <div className="flex items-center text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>{assignment.course.name}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="w-4 h-4 mr-2" />
                  <span>Instructor: {assignment.course.teacher.email}</span>
                </div>
              </>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDueDate(assignment.dueDate)}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <FileText className="w-4 h-4 mr-2" />
              <span>Rubric: {assignment.rubric.name}</span>
            </div>
          </div>

          {submission && submission.finalScore !== null && (
            <div className="mb-4 p-3 bg-accent rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-accent-foreground">Final Score</span>
                <span className="text-lg font-bold text-accent-foreground">{submission.finalScore}</span>
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
    <div className="bg-background text-foreground">
      <PageHeader 
        title="All Assignments" 
        subtitle={`${assignments.length} assignments available`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/student/courses">
                My Courses
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/student/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Course Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Enrolled Courses</p>
                    <p className="text-2xl font-bold text-foreground">{Object.keys(assignmentsByCourse).length}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                    <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-foreground">{categorizedAssignments.pending.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignments by Course */}
          {Object.entries(assignmentsByCourse).map(([courseId, { course, assignments: courseAssignments }]) => (
            <Card key={courseId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {course.name}
                </CardTitle>
                <div className="text-sm text-gray-600">
                  <p>Instructor: {course.teacher.email}</p>
                  <p>{courseAssignments.length} assignment{courseAssignments.length !== 1 ? 's' : ''}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courseAssignments.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} showCourse={false} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

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
        </div>
      </main>
    </div>
  );
} 