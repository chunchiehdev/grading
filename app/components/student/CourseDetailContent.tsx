import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatScheduleDisplay } from '@/constants/schedule';
import type { StudentCourseDetailData } from '@/services/student-course-detail.server';
import type { StudentInfo, StudentAssignmentInfo } from '@/types/student';

interface CourseDetailContentProps {
  data: StudentCourseDetailData & {
    student: StudentInfo;
  };
}

export function CourseDetailContent({ data }: CourseDetailContentProps) {
  const { t, i18n } = useTranslation(['course', 'assignment', 'common']);
  const { course, myClass, enrolledAt, assignments, stats, student } = data;

  // 當前語言
  const currentLanguage = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // Format enrolled date
  const formattedEnrolledDate = new Date(enrolledAt).toLocaleDateString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full bg-background">
      {/* 返回按鈕 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/student/courses" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('common:back')}
          </Link>
        </Button>
      </div>

      {/* 大標題區 - 居中，緊湊版 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 xl:pt-10 pb-6 lg:pb-8 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mb-2 lg:mb-3 text-foreground">
          {course.name}
        </h1>
        {course.description && (
          <p className="text-sm lg:text-base text-muted-foreground max-w-3xl mx-auto">{course.description}</p>
        )}
      </div>

      {/* 內容區 - 列表盤模式 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24 space-y-0">
        {/* 教師資訊 - 簡潔行樣式，無卡片背景 */}
        <div className="py-4 border-b border-border hover:bg-accent/15 dark:hover:bg-accent/25 transition-colors duration-150">
          <div className="flex items-start gap-3">
            <img
              src={course.teacher.picture || '/default-avatar.png'}
              alt={course.teacher.name}
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover bg-muted dark:bg-muted flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-base lg:text-lg font-medium text-foreground">{course.teacher.name}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-medium">
                  {t('course:detail.instructor')}
                </span>
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground dark:text-muted-foreground mt-1 space-y-0.5">
                {myClass && myClass.schedule && myClass.schedule.weekday && myClass.schedule.periodCode ? (
                  <div>
                    {t('course:detail.class')}：{myClass.name} •{' '}
                    {formatScheduleDisplay(myClass.schedule.weekday, myClass.schedule.periodCode, currentLanguage)}
                    {myClass.schedule.room && <span className="ml-1">• {myClass.schedule.room}</span>}
                  </div>
                ) : (
                  <div>{t('course:detail.allCourse')}</div>
                )}
                <div>
                  {t('course:detail.joined')}：{formattedEnrolledDate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 作業列表 - 列表盤模式（無卡片背景） */}
        {assignments.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mb-3" />
            <h3 className="text-base lg:text-lg font-medium text-foreground mb-1">
              {t('course:detail.noAssignments')}
            </h3>
            <p className="text-sm lg:text-base text-muted-foreground">{t('course:detail.noAssignmentsDescription')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {assignments.map((assignment, index) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                studentId={student.id}
                isLast={index === assignments.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Assignment List Item - Apple Style
interface AssignmentCardProps {
  assignment: StudentAssignmentInfo;
  studentId: string;
  isLast: boolean;
}

function AssignmentCard({ assignment, studentId, isLast }: AssignmentCardProps) {
  const { t } = useTranslation('assignment');
  const hasSubmission = assignment.submissions.some((sub: any) => sub.studentId === studentId);
  const submission = assignment.submissions.find((sub: any) => sub.studentId === studentId);

  const getStatusBadge = () => {
    if (hasSubmission) {
      if (submission?.status === 'GRADED') {
        return (
          <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0 text-xs">
            {t('status.graded')}
          </Badge>
        );
      }
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 text-xs">
          {t('status.submitted')}
        </Badge>
      );
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-0 text-xs">
          {t('status.overdue')}
        </Badge>
      );
    }

    return (
      <Badge className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-0 text-xs">
        {t('status.pending')}
      </Badge>
    );
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

  return (
    <Link
      to={`/student/assignments/${assignment.id}/submit`}
      className="block group hover:bg-accent/15 dark:hover:bg-accent/25 transition-colors duration-150"
    >
      <div className="p-3 sm:p-4 lg:p-5">
        {/* 標題和狀態行 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm lg:text-base font-medium text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors duration-150">
              {assignment.name}
            </h3>
            {assignment.description && (
              <p className="text-xs lg:text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2 mt-0.5">
                {assignment.description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">{getStatusBadge()}</div>
        </div>

        {/* 底部資訊 - 單行緊湊 */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
          {assignment.class && <span className="text-blue-700 dark:text-blue-300">{assignment.class.name}</span>}
          {!assignment.class && <span>{t('course:detail.allCourse')}</span>}
          <span>•</span>
          <span>{assignment.rubric.name}</span>
          {assignment.dueDate && (
            <>
              <span>•</span>
              <span>{formatDueDate(assignment.dueDate)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
