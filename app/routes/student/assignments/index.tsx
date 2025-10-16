import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Clock, BookOpen, FileText, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';

import { requireStudent } from '@/services/auth.server';
import { getStudentAssignments, type StudentAssignmentInfo } from '@/services/submission.server';
import { getStudentEnrolledCourses, type CourseWithEnrollmentInfo } from '@/services/enrollment.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  student: { id: string; email: string; role: string };
  assignments: StudentAssignmentInfo[];
  enrolledCourses: CourseWithEnrollmentInfo[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);
  const [assignments, enrolledCourses] = await Promise.all([
    getStudentAssignments(student.id),
    getStudentEnrolledCourses(student.id),
  ]);
  return { student, assignments, enrolledCourses };
}

export default function StudentAssignments() {
  const { student, assignments, enrolledCourses } = useLoaderData<typeof loader>();
  const { t } = useTranslation('assignment');

  // Enhanced empty states with guidance while staying clean
  if (assignments.length === 0) {
    const isNotEnrolled = enrolledCourses.length === 0;

    return (
      <div className="h-full flex flex-col">
        {/* Main Content - Takes remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center space-y-8 max-w-md">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
              {isNotEnrolled ? (
                <UserPlus className="w-12 h-12 text-muted-foreground" />
              ) : (
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              )}
            </div>

            {/* Main Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {isNotEnrolled ? t('emptyState.notEnrolled.title') : t('emptyState.noAssignments.title')}
              </h1>
              <p className="text-muted-foreground">
                {isNotEnrolled ? t('emptyState.notEnrolled.description') : t('emptyState.noAssignments.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group assignments by course
  const assignmentsByCourse = assignments.reduce(
    (acc, assignment) => {
      const courseId = assignment.course.id;
      if (!acc[courseId]) {
        acc[courseId] = {
          course: assignment.course,
          assignments: [],
        };
      }
      acc[courseId].assignments.push(assignment);
      return acc;
    },
    {} as Record<string, { course: StudentAssignmentInfo['course']; assignments: StudentAssignmentInfo[] }>
  );

  // Categorize assignments
  const categorizedAssignments = assignments.reduce(
    (acc, assignment) => {
      const hasSubmission = assignment.submissions.some((sub) => sub.studentId === student.id);

      if (hasSubmission) {
        const submission = assignment.submissions.find((sub) => sub.studentId === student.id);
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
    },
    {
      pending: [] as StudentAssignmentInfo[],
      submitted: [] as StudentAssignmentInfo[],
      graded: [] as StudentAssignmentInfo[],
      overdue: [] as StudentAssignmentInfo[],
    }
  );

  const getStatusBadge = (assignment: StudentAssignmentInfo) => {
    const hasSubmission = assignment.submissions.some((sub) => sub.studentId === student.id);

    if (hasSubmission) {
      const submission = assignment.submissions.find((sub) => sub.studentId === student.id);
      if (submission?.status === 'GRADED') {
        return <Badge variant="default">{t('status.graded')}</Badge>;
      }
      return <Badge variant="secondary">{t('status.submitted')}</Badge>;
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return <Badge variant="destructive">{t('status.overdue')}</Badge>;
    }

    return <Badge variant="outline">{t('status.pending')}</Badge>;
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return t('dueDate.noDueDate');

    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return t('dueDate.overdue', { days: Math.abs(diffDays) });
    } else if (diffDays === 0) {
      return t('dueDate.dueToday');
    } else if (diffDays === 1) {
      return t('dueDate.dueTomorrow');
    } else {
      return t('dueDate.dueInDays', { days: diffDays });
    }
  };

  const AssignmentCard = ({ assignment }: { assignment: StudentAssignmentInfo }) => {
    const hasSubmission = assignment.submissions.some((sub) => sub.studentId === student.id);
    const submission = assignment.submissions.find((sub) => sub.studentId === student.id);

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {assignment.name}
              </CardTitle>
              <div className="mt-1 min-h-[1rem]">
                {assignment.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
                )}
              </div>
            </div>
            <div className="ml-2">{getStatusBadge(assignment)}</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Assignment stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-bold text-foreground">{assignment.course.name}</div>
              <div className="text-xs font-medium text-muted-foreground">{t('assignmentCard.courseName')}</div>
            </div>
            {submission && submission.finalScore !== null ? (
              <div className="text-center p-3 bg-accent rounded-lg">
                <div className="text-sm font-bold text-accent-foreground">{submission.finalScore}</div>
                <div className="text-xs font-medium text-muted-foreground">{t('assignmentCard.finalScore')}</div>
              </div>
            ) : (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm font-bold text-foreground">{formatDueDate(assignment.dueDate)}</div>
                <div className="text-xs font-medium text-muted-foreground">{t('assignmentCard.dueDate')}</div>
              </div>
            )}
          </div>

          {/* Assignment details */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('assignmentCard.details')}</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1">
                  {t('labels.rubricPrefix')}
                  {assignment.rubric.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1">
                  {t('courseInfo.instructorLabel', { email: assignment.course.teacher.email })}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2 pt-2">
            {!hasSubmission ? (
              <Button asChild size="sm" className="flex-1">
                <Link to={`/student/assignments/${assignment.id}/submit`}>{t('assignmentCard.submit')}</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to={`/student/assignments/${assignment.id}/submit`}>{t('assignmentCard.viewSubmission')}</Link>
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
        title={t('pageHeader.allAssignments')}
        subtitle={t('pageHeader.subtitle', { count: assignments.length })}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/student/courses">{t('pageHeader.myCourses')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/student/dashboard">{t('pageHeader.backToDashboard')}</Link>
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Course Overview - Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('overview.enrolledCourses')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('overview.totalAssignments')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('overview.pending')}</p>
                  <p className="text-2xl font-bold text-foreground">{categorizedAssignments.pending.length}</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      </main>
    </div>
  );
}
