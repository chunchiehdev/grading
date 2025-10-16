import { FileText, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
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
  const formattedEnrolledDate = new Date(enrolledAt).toLocaleDateString(
    currentLanguage === 'zh' ? 'zh-TW' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 大標題區 - 居中 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {course.name}
        </h1>
        {course.description && (
          <p className="text-base lg:text-lg xl:text-xl text-muted-foreground max-w-3xl mx-auto">
            {course.description}
          </p>
        )}
      </div>

      {/* 內容區 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32 space-y-6 lg:space-y-8 xl:space-y-10">
        {/* 教師資訊卡片 */}
        <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10">
          <div className="flex items-start gap-4 lg:gap-6">
            <img
              src={course.teacher.picture || '/default-avatar.png'}
              alt={course.teacher.name}
              className="w-14 h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full object-cover bg-muted flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm lg:text-base text-muted-foreground mb-1">
                {t('course:detail.teacher')}
              </div>
              <div className="text-lg lg:text-xl xl:text-2xl font-medium text-foreground mb-3">
                {course.teacher.name}
              </div>
              <div className="text-sm lg:text-base text-muted-foreground space-y-2">
                {myClass && myClass.schedule && myClass.schedule.weekday && myClass.schedule.periodCode ? (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">{t('course:detail.class')}：{myClass.name}</div>
                      <div className="text-xs lg:text-sm mt-1">
                        {formatScheduleDisplay(
                          myClass.schedule.weekday,
                          myClass.schedule.periodCode,
                          currentLanguage
                        )}
                        {myClass.schedule.room && (
                          <span className="ml-2">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {myClass.schedule.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-foreground">{t('course:detail.allCourse')}</div>
                )}
                <div className="text-xs lg:text-sm">
                  {t('course:detail.joined')}：{formattedEnrolledDate}
                </div>
              </div>
            </div>
          </div>

          {/* 統計資訊 - 緊湊的內嵌排列 */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex flex-wrap gap-6 text-sm">
              {/* 作業總數 */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-base font-semibold text-foreground">{stats.total}</span>
                <span className="text-sm text-muted-foreground">{t('course:detail.totalAssignments')}</span>
              </div>

              {/* 已完成 */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-base font-semibold text-green-600 dark:text-green-400">{stats.completed}</span>
                <span className="text-sm text-muted-foreground">{t('course:detail.completed')}</span>
              </div>

              {/* 待繳交 */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">{stats.pending}</span>
                <span className="text-sm text-muted-foreground">{t('course:detail.pending')}</span>
              </div>

              {/* 平均分數 - 條件顯示 */}
              {stats.averageScore !== null && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-base font-semibold text-blue-600 dark:text-blue-400">{stats.averageScore.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">{t('course:detail.averageScore')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 作業列表 */}
        <div>
          <h2 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground mb-4 lg:mb-6">
            {t('course:detail.assignmentList')}
          </h2>

          {assignments.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-sm p-8 lg:p-12 text-center">
              <FileText className="mx-auto h-12 w-12 lg:h-16 lg:w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg lg:text-xl font-medium text-foreground mb-2">
                {t('course:detail.noAssignments')}
              </h3>
              <p className="text-base lg:text-lg text-muted-foreground">
                {t('course:detail.noAssignmentsDescription')}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
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
          <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0 text-xs lg:text-sm">
            {t('status.graded')}
          </Badge>
        );
      }
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 text-xs lg:text-sm">
          {t('status.submitted')}
        </Badge>
      );
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-0 text-xs lg:text-sm">
          {t('status.overdue')}
        </Badge>
      );
    }

    return (
      <Badge className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-0 text-xs lg:text-sm">
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
      className={`block group hover:bg-accent/5 transition-colors ${!isLast ? 'border-b' : ''}`}
    >
      <div className="p-5 sm:p-6 lg:p-8">
        {/* 標題行 */}
        <div className="flex items-start justify-between gap-4 mb-3 lg:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-lg xl:text-xl font-medium text-foreground group-hover:text-primary transition-colors mb-1">
              {assignment.name}
            </h3>
            {assignment.description && (
              <p className="text-sm lg:text-base text-muted-foreground line-clamp-2">{assignment.description}</p>
            )}
          </div>
          <div className="flex-shrink-0">{getStatusBadge()}</div>
        </div>

        {/* 分數顯示 */}
        {hasSubmission && submission?.finalScore !== null && (
          <div className="mb-3 lg:mb-4">
            <div className="inline-flex items-baseline gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <span className="text-2xl lg:text-3xl font-semibold text-green-600 dark:text-green-400">
                {submission?.finalScore}
              </span>
              <span className="text-sm lg:text-base text-muted-foreground">{t('assignmentCard.finalScore')}</span>
            </div>
          </div>
        )}

        {hasSubmission && submission?.finalScore === null && (
          <div className="mb-3 lg:mb-4">
            <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm lg:text-base text-blue-600 dark:text-blue-400">
              {t('assignmentCard.submitted')} • {t('assignmentCard.awaitingGrading')}
            </span>
          </div>
        )}

        {/* 底部資訊 */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs lg:text-sm text-muted-foreground">
          {assignment.class && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
              {assignment.class.name}
            </span>
          )}
          {!assignment.class && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {t('course:detail.allCourse')}
            </span>
          )}
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
