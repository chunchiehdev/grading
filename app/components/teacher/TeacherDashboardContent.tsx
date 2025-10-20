import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import type { TeacherInfo, SubmissionInfo, CourseInfo } from '@/types/teacher';

interface TeacherDashboardContentProps {
  data: {
    teacher: TeacherInfo;
    courses: CourseInfo[];
    recentSubmissions: SubmissionInfo[];
  };
}

export function TeacherDashboardContent({ data }: TeacherDashboardContentProps) {
  const { recentSubmissions } = data;
  const { t } = useTranslation(['teacher']);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('teacher:dashboard.timeAgo.justNow');
    if (diffInMinutes < 60) return t('teacher:dashboard.timeAgo.minutesAgo', { count: diffInMinutes });
    if (diffInMinutes < 1440)
      return t('teacher:dashboard.timeAgo.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
    return t('teacher:dashboard.timeAgo.daysAgo', { count: Math.floor(diffInMinutes / 1440) });
  };

  const getScoreDisplay = (normalizedScore: number | null) => {
    if (normalizedScore === null) {
      return <span className="text-sm text-muted-foreground">{t('teacher:dashboard.grading.grading')}</span>;
    }
    return (
      <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary">
        <span className="text-sm font-medium">{normalizedScore.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="bg-background">
      {/* Table Header Row */}
      <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">{t('teacher:dashboard.tableHeaders.student')}</div>
          <div className="col-span-3">{t('teacher:dashboard.tableHeaders.assignment')}</div>
          <div className="col-span-2">{t('teacher:dashboard.tableHeaders.course')}</div>
          <div className="col-span-2">{t('teacher:dashboard.tableHeaders.submittedAt')}</div>
          <div className="col-span-1 text-right">{t('teacher:dashboard.tableHeaders.score')}</div>
        </div>
      </div>

      {/* List Content */}
      {recentSubmissions.length === 0 ? (
        <div className="text-center py-12 md:py-16 lg:py-20 px-6">
          <FileText className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
          <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
            {t('teacher:dashboard.emptyState.noSubmissions')}
          </h3>
          <p className="mt-2 md:mt-4 text-base md:text-lg text-muted-foreground">
            {t('teacher:dashboard.emptyState.noSubmissionsDescription')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recentSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                // Navigate to the specific submission detail page
                const url = `/teacher/submissions/${submission.id}/view`;
                window.location.href = url;
              }}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Student Column */}
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {submission.student?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {submission.student?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{submission.student?.email || ''}</p>
                  </div>
                </div>

                {/* Assignment Column */}
                <div className="col-span-3">
                  <p className="text-sm text-foreground truncate hover:text-primary transition-colors">
                    {submission.assignmentArea.name}
                  </p>
                </div>

                {/* Course Column */}
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground truncate">{submission.assignmentArea.course.name}</p>
                </div>

                {/* Time Column */}
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">{formatTimeAgo(submission.uploadedAt)}</p>
                </div>

                {/* Score Column */}
                <div className="col-span-1 text-right">{getScoreDisplay(submission.normalizedScore)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
