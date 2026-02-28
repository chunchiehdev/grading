import {
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { StudentCourseDetailData } from '@/services/student-course-detail.server';
import type { StudentInfo, StudentAssignmentInfo } from '@/types/student';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface CourseDetailContentProps {
  data: StudentCourseDetailData & {
    student: StudentInfo;
  };
}

// ============================================================================
// Compact Course Header
// ============================================================================
interface CourseHeaderProps {
  course: StudentCourseDetailData['course'];
  stats?: { total: number; completed: number; pending: number };
}

function CourseHeader({ course, stats }: CourseHeaderProps) {
  const { t } = useTranslation('course');
  void stats;

  return (
    <div className="pb-6 sm:pb-8">
      {/* Course Info with Community Button */}
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {course.name}
          </h1>
          {course.description && (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {course.description}
            </p>
          )}
        </div>
        
        {/* Community Button */}
        <Button
          asChild
          variant="ghost"
          size="icon-2xl"
          className="h-11 w-11 flex-shrink-0 self-start sm:h-12 sm:w-12"
          title={t('community.title', '社群')}
        >
          <Link to={`/student/courses/${course.id}/community`}>
            <Users className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <Separator className="my-5 sm:my-6" />

      {/* Teacher Info with Avatar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('detail.teacher', '授課教師')}:</span>
        <Avatar className="h-6 w-6">
          <AvatarImage src={course.teacher.picture || '/default-avatar.png'} alt={course.teacher.name} referrerPolicy="no-referrer" />
          <AvatarFallback>{course.teacher.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">{course.teacher.name}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State - Calm, editorial style
// ============================================================================
interface EmptyStateProps {
  courseId: string;
}

function EmptyState({ courseId }: EmptyStateProps) {
  const { t } = useTranslation('course');

  return (
    <div className="py-24">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-8">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          {t('detail.noAssignments', '目前沒有作業')}
        </h2>
        <p className="text-base text-muted-foreground font-light leading-relaxed mb-10">
          {t('detail.noAssignmentsDescription', '老師還沒有發布作業，請稍後再回來查看')}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Assignment Card - Editorial, soft color tints
// ============================================================================
interface AssignmentCardProps {
  assignment: StudentAssignmentInfo;
  studentId: string;
  status: 'urgent' | 'pending' | 'completed';
}

function AssignmentCard({ assignment, studentId, status }: AssignmentCardProps) {
  const { t } = useTranslation('assignment');
  const submission = assignment.submissions.find((sub) => sub.studentId === studentId);

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: t('dueDate.overdue', { days: Math.abs(diffDays) }), isOverdue: true };
    } else if (diffDays === 0) {
      return { text: t('dueDate.dueToday'), isOverdue: false };
    } else if (diffDays === 1) {
      return { text: t('dueDate.dueTomorrow'), isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: t('dueDate.dueInDays', { days: diffDays }), isOverdue: false };
    } else {
      return { text: date.toLocaleDateString(), isOverdue: false };
    }
  };

  const dueInfo = formatDueDate(assignment.dueDate);
  const hasScore = submission?.status === 'GRADED' && submission.finalScore !== null;

  // Status styling - soft background tints
  const cardStyles = {
    urgent: 'bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30',
    pending: 'bg-background hover:bg-muted/30',
    completed: 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
  };

  const iconStyles = {
    urgent: 'text-orange-600 dark:text-orange-500',
    pending: 'text-muted-foreground',
    completed: 'text-emerald-600 dark:text-emerald-500',
  };

  const StatusIcon = status === 'completed' ? CheckCircle2 : status === 'urgent' ? AlertTriangle : Clock;

  return (
    <Link to={`/student/assignments/${assignment.id}/submit`} className="block group">
      <div className={cn(
        'relative h-full rounded-xl border p-4 transition-all duration-200 sm:rounded-2xl sm:p-6',
        cardStyles[status],
        status === 'completed' ? 'border-emerald-200/50 dark:border-emerald-900/30' : 'border-border',
        'hover:shadow-md motion-safe:hover:-translate-y-0.5'
      )}>
        
        {/* Icon - Top left */}
        <div className="mb-4">
          <StatusIcon className={cn('w-5 h-5', iconStyles[status])} strokeWidth={1.5} />
        </div>

        {/* Title */}
          <h3 className={cn(
          'mb-2 text-base font-semibold leading-snug sm:text-lg',
          status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
        )}>
          {assignment.name}
        </h3>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          {dueInfo && (
            <div className={cn(
              'text-sm font-medium',
              dueInfo.isOverdue ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'
            )}>
              {dueInfo.text}
            </div>
          )}
          
          {assignment.class && (
            <div className="text-xs text-muted-foreground">
              {assignment.class.name}
            </div>
          )}
        </div>

        {/* Score or Arrow */}
        <div className="flex items-end justify-between mt-auto pt-4">
          {hasScore ? (
            <div>
              <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{submission.finalScore}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">/ 100</div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <ChevronRight className={cn(
            'w-5 h-5 transition-opacity',
            hasScore ? 'opacity-0 group-hover:opacity-30' : 'opacity-0 group-hover:opacity-100',
            iconStyles[status]
          )} />
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Section Header - Editorial, typography-driven
// ============================================================================
interface SectionHeaderProps {
  title: string;
  count: number;
}

function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="inline-block text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <span className="ml-2 text-xl font-light text-muted-foreground sm:ml-3 sm:text-2xl">({count})</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export function CourseDetailContent({ data }: CourseDetailContentProps) {
  const { t } = useTranslation(['course', 'assignment']);
  const { course, assignments, stats, student } = data;

  const groupedAssignments = useMemo(() => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const urgent: StudentAssignmentInfo[] = [];
    const pending: StudentAssignmentInfo[] = [];
    const completed: StudentAssignmentInfo[] = [];

    assignments.forEach((assignment) => {
      const hasSubmission = assignment.submissions.some((sub) => sub.studentId === student.id);
      const submission = assignment.submissions.find((sub) => sub.studentId === student.id);

      // Completed
      if (submission?.status === 'GRADED') {
        completed.push(assignment);
        return;
      }

      // Check urgency
      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate < now && !hasSubmission) {
          // Overdue
          urgent.push(assignment);
        } else if (dueDate <= oneWeekLater) {
          // Due soon
          urgent.push(assignment);
        } else {
          pending.push(assignment);
        }
      } else {
        pending.push(assignment);
      }
    });

    // Sort urgent by due date
    urgent.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));

    return { urgent, pending, completed };
  }, [assignments, student.id]);

  const hasAssignments = assignments.length > 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header - No bar, just content */}
      <CourseHeader course={course} stats={hasAssignments ? stats : undefined} />

      {hasAssignments ? (
        /* Assignment Grid - Generous spacing */
        <div className="pb-12 sm:pb-16">
          {/* Urgent / Due Soon Section */}
          {groupedAssignments.urgent.length > 0 && (
            <div className="mb-10 sm:mb-16">
              <SectionHeader
                title={t('assignment:status.needsAttention', '需要注意')}
                count={groupedAssignments.urgent.length}
              />
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {groupedAssignments.urgent.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} studentId={student.id} status="urgent" />
                ))}
              </div>
            </div>
          )}

          {/* Pending Section */}
          {groupedAssignments.pending.length > 0 && (
            <div className="mb-10 sm:mb-16">
              <SectionHeader
                title={t('assignment:status.later', '稍後')}
                count={groupedAssignments.pending.length}
              />
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {groupedAssignments.pending.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} studentId={student.id} status="pending" />
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {groupedAssignments.completed.length > 0 && (
            <div>
              <SectionHeader
                title={t('assignment:status.completed', '已完成')}
                count={groupedAssignments.completed.length}
              />
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {groupedAssignments.completed.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} studentId={student.id} status="completed" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State View */
        <EmptyState courseId={course.id} />
      )}
    </div>
  );
}
