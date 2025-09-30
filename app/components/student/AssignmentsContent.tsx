import { UserPlus, CheckCircle } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAssignmentWebSocket } from '@/hooks/useAssignmentWebSocket';

interface StudentAssignmentInfo {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  course: {
    id: string;
    name: string;
    teacher: {
      id: string;
      email: string;
      name: string;
      picture: string;
    };
  };
  rubric: {
    name: string;
  };
  submissions: Array<{
    studentId: string;
    status: string;
    finalScore: number | null;
  }>;
}

interface CourseWithEnrollmentInfo {
  id: string;
  name: string;
}

interface AssignmentsData {
  student: { id: string; email: string; role: string };
  assignments: StudentAssignmentInfo[];
  enrolledCourses: CourseWithEnrollmentInfo[];
}

interface AssignmentsContentProps {
  data: AssignmentsData;
  externalFilter?: string;
}

export function AssignmentsContent({ data, externalFilter }: AssignmentsContentProps) {
  const { student, assignments: initialAssignments, enrolledCourses } = data;
  const { t } = useTranslation('assignment');

  // Zustand store
  const assignments = useAssignmentStore(state => state.assignments);
  const setAssignments = useAssignmentStore(state => state.setAssignments);

  // WebSocket integration for real-time updates
  useAssignmentWebSocket(student.id);

  // Initialize store with server data
  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments, setAssignments]);

  // Use external filter if provided, otherwise use 'all'
  const currentFilter = externalFilter || 'all';

  // Enhanced empty states with guidance while staying clean
  if (assignments.length === 0) {
    const isNotEnrolled = enrolledCourses.length === 0;
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
    );
  }


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
        return <Badge variant="default">{t('status.graded')}</Badge>;
      }
      return <Badge variant="secondary">{t('status.submitted')}</Badge>;
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return <Badge variant="destructive">{t('status.overdue')}</Badge>;
    }

    // 待繳交使用警示色
    return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">{t('status.pending')}</Badge>;
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
    const hasSubmission = assignment.submissions.some(sub => sub.studentId === student.id);
    const submission = assignment.submissions.find(sub => sub.studentId === student.id);

    return (
      <Link to={`/student/assignments/${assignment.id}/submit`} className="block">
        <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 h-full grid grid-rows-[1fr_auto_auto_auto]">
          {/* Header - 可變高度但有最小高度 */}
          <CardHeader className="p-6 min-h-[140px] flex flex-col justify-start">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {assignment.name}
                </CardTitle>
                {assignment.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {assignment.description}
                  </p>
                )}
              </div>
              <div className="ml-2">
                {getStatusBadge(assignment)}
              </div>
            </div>
          </CardHeader>

          {/* Statistics - 固定高度區域 */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-start gap-8">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-muted-foreground">{assignment.course.name}</span>
                <span className="text-sm text-muted-foreground">{t('assignmentCard.courseName')}</span>
              </div>
              {hasSubmission && submission?.finalScore !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-accent-foreground">{submission?.finalScore}</span>
                  <span className="text-sm text-muted-foreground">{t('assignmentCard.finalScore')}</span>
                </div>
              ) : hasSubmission ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-blue-600">{t('assignmentCard.submitted')}</span>
                  <span className="text-sm text-muted-foreground">{t('assignmentCard.awaitingGrading')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{formatDueDate(assignment.dueDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Info - 固定高度區域 */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src={assignment.course.teacher.picture}
                alt={assignment.course.teacher.name}
                className="w-10 h-10 rounded-full object-cover bg-muted"
              />
              <div className="flex-1">
                <div className="text-base font-medium text-muted-foreground">{assignment.course.teacher.name}</div>
                <div className="text-sm text-muted-foreground">{t('assignmentCard.rubric')}: {assignment.rubric.name}</div>
              </div>
            </div>
          </div>

          {/* Due Date / Action - 固定高度區域 */}
          <div className="mx-2 mb-2 px-4 py-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {assignment.dueDate ? formatDueDate(assignment.dueDate) : t('assignmentCard.noDueDate')}
              </span>
              <span className="text-primary font-medium">
                {!hasSubmission ? t('assignmentCard.submit') : t('assignmentCard.viewSubmission')}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  // Filter assignments based on current filter
  const getFilteredAssignments = () => {
    switch (currentFilter) {
      case 'pending':
        return [...categorizedAssignments.pending, ...categorizedAssignments.overdue];
      case 'submitted':
        return categorizedAssignments.submitted;
      case 'graded':
        return categorizedAssignments.graded;
      default:
        return assignments;
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {getFilteredAssignments().map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}