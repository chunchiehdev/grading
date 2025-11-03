import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { StudentCourseDetailData } from '@/services/student-course-detail.server';
import type { StudentInfo, StudentAssignmentInfo } from '@/types/student';
import { useState, useMemo } from 'react';

interface CourseDetailContentProps {
  data: StudentCourseDetailData & {
    student: StudentInfo;
  };
}

export function CourseDetailContent({ data }: CourseDetailContentProps) {
  const { t } = useTranslation(['course', 'assignment', 'common']);
  const { course, assignments, stats, student } = data;

  // 分組作業：逾期 > 本週 > 稍後 > 已完成
  const groupedAssignments = useMemo(() => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue: StudentAssignmentInfo[] = [];
    const thisWeek: StudentAssignmentInfo[] = [];
    const later: StudentAssignmentInfo[] = [];
    const completed: StudentAssignmentInfo[] = [];

    assignments.forEach((assignment) => {
      const hasSubmission = assignment.submissions.some((sub) => sub.studentId === student.id);
      const submission = assignment.submissions.find((sub) => sub.studentId === student.id);

      // 已完成
      if (submission?.status === 'GRADED') {
        completed.push(assignment);
        return;
      }

      // 未完成但有截止日期
      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate < now && !hasSubmission) {
          overdue.push(assignment);
        } else if (dueDate <= oneWeekLater) {
          thisWeek.push(assignment);
        } else {
          later.push(assignment);
        }
      } else {
        // 無截止日期
        later.push(assignment);
      }
    });

    // 排序：逾期和本週按日期升序，稍後和已完成按創建時間降序
    overdue.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
    thisWeek.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));

    return { overdue, thisWeek, later, completed };
  }, [assignments, student.id]);

  const [showLater, setShowLater] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // 當沒有作業時，使用簡化版 header（不 sticky）
  const hasAssignments = assignments.length > 0;

  return (
    <div className="w-full bg-background min-h-screen">
      {hasAssignments ? (
        <>
          {/* 有作業時：極簡 sticky header */}
          <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{course.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {course.teacher.name}
                  {course.description && (
                    <>
                      {' '}
                      • <span className="hidden sm:inline">{course.description}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="ml-4 text-right flex-shrink-0">
                <div className="text-2xl font-bold text-foreground">
                  {stats.completed}/{stats.total}
                </div>
                <div className="text-xs text-muted-foreground">{t('course:detail.completed')}</div>
              </div>
            </div>
          </div>

          {/* 作業列表 - 分層展示 */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <div className="space-y-8">
              {/* 逾期作業 - 最突出 */}
              {groupedAssignments.overdue.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">
                    {t('assignment:status.overdue')} ({groupedAssignments.overdue.length})
                  </h2>
                  <div className="space-y-2">
                    {groupedAssignments.overdue.map((assignment) => (
                      <AssignmentItem
                        key={assignment.id}
                        assignment={assignment}
                        studentId={student.id}
                        priority="high"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 本週截止 - 次明顯 */}
              {groupedAssignments.thisWeek.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-3">
                    {t('assignment:status.thisWeek')} ({groupedAssignments.thisWeek.length})
                  </h2>
                  <div className="space-y-2">
                    {groupedAssignments.thisWeek.map((assignment) => (
                      <AssignmentItem
                        key={assignment.id}
                        assignment={assignment}
                        studentId={student.id}
                        priority="medium"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 稍後作業 - 可摺疊 */}
              {groupedAssignments.later.length > 0 && (
                <section>
                  <button
                    onClick={() => setShowLater(!showLater)}
                    className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    <span className="uppercase tracking-wider">
                      {t('assignment:status.later')} ({groupedAssignments.later.length})
                    </span>
                    {showLater ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showLater && (
                    <div className="space-y-2">
                      {groupedAssignments.later.map((assignment) => (
                        <AssignmentItem key={assignment.id} assignment={assignment} studentId={student.id} priority="low" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 已完成 - 灰色、可摺疊 */}
              {groupedAssignments.completed.length > 0 && (
                <section>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    <span className="uppercase tracking-wider">
                      {t('assignment:status.completed')} ({groupedAssignments.completed.length})
                    </span>
                    {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showCompleted && (
                    <div className="space-y-2 opacity-60">
                      {groupedAssignments.completed.map((assignment) => (
                        <AssignmentItem
                          key={assignment.id}
                          assignment={assignment}
                          studentId={student.id}
                          priority="completed"
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 沒有作業時：統一的簡潔 header */}
          <div className="border-b border-border">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              <div className="flex items-center gap-4">
                <img
                  src={course.teacher.picture || '/default-avatar.png'}
                  alt={course.teacher.name}
                  className="w-12 h-12 rounded-full object-cover bg-muted flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold text-foreground mb-1">{course.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {course.teacher.name}
                    {course.description && (
                      <>
                        {' '}
                        • <span className="hidden sm:inline">{course.description}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Empty state - 極簡 */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">{t('course:detail.noAssignmentsDescription')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Assignment Item - Canvas-inspired simple design
interface AssignmentItemProps {
  assignment: StudentAssignmentInfo;
  studentId: string;
  priority: 'high' | 'medium' | 'low' | 'completed';
}

function AssignmentItem({ assignment, studentId, priority }: AssignmentItemProps) {
  const { t } = useTranslation('assignment');
  const submission = assignment.submissions.find((sub) => sub.studentId === studentId);

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;

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
    } else if (diffDays <= 7) {
      return t('dueDate.dueInDays', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  // 根據優先級決定樣式
  const getPriorityStyles = () => {
    switch (priority) {
      case 'high':
        return 'border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30';
      case 'medium':
        return 'border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30';
      case 'low':
        return 'border border-border hover:bg-accent/50';
      case 'completed':
        return 'border border-green-200 dark:border-green-900 bg-muted/30 hover:bg-muted/50';
      default:
        return 'border border-border hover:bg-accent/50';
    }
  };

  return (
    <Link
      to={`/student/assignments/${assignment.id}/submit`}
      className={`block rounded-md transition-all duration-150 ${getPriorityStyles()}`}
    >
      <div className="px-4 py-3">
        {/* 標題行 */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3
            className={`text-base font-semibold ${priority === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
          >
            {assignment.name}
          </h3>
          {submission?.status === 'GRADED' && submission.finalScore !== null && (
            <span className="text-lg font-bold text-green-600 dark:text-green-400 flex-shrink-0">
              {submission.finalScore}
            </span>
          )}
        </div>

        {/* 描述（如果有） */}
        {assignment.description && priority !== 'completed' && (
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{assignment.description}</p>
        )}

        {/* 底部元資訊 - 極簡 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {assignment.dueDate && (
            <>
              <span className={priority === 'high' ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                {formatDueDate(assignment.dueDate)}
              </span>
              <span>•</span>
            </>
          )}
          <span>{assignment.rubric.name}</span>
          {assignment.class && (
            <>
              <span>•</span>
              <span>{assignment.class.name}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
