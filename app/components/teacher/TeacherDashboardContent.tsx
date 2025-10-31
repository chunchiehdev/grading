import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
    if (diffInMinutes < 1440) return t('teacher:dashboard.timeAgo.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
    return t('teacher:dashboard.timeAgo.daysAgo', { count: Math.floor(diffInMinutes / 1440) });
  };

  const getScoreDisplay = (normalizedScore: number | null) => {
    if (normalizedScore === null) {
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          {t('teacher:dashboard.grading.grading')}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20">
        {normalizedScore.toFixed(1)}
      </Badge>
    );
  };

  return (
    <div className="bg-background">
      {/* Table Header Row - Hidden on mobile, visible on desktop */}
      {recentSubmissions.length > 0 && (
        <div className="hidden lg:block px-6 lg:px-8 xl:px-10 py-4 border-b border-border">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">{t('teacher:dashboard.tableHeaders.student')}</div>
            <div className="col-span-3">{t('teacher:dashboard.tableHeaders.assignment')}</div>
            <div className="col-span-2">{t('teacher:dashboard.tableHeaders.course')}</div>
            <div className="col-span-2">{t('teacher:dashboard.tableHeaders.submittedAt')}</div>
            <div className="col-span-1 text-right">{t('teacher:dashboard.tableHeaders.score')}</div>
          </div>
        </div>
      )}

      {/* List Content */}
      {recentSubmissions.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-8 max-w-md px-6">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>

            {/* Main Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {t('teacher:dashboard.emptyState.noSubmissions')}
              </h1>
              <p className="text-muted-foreground">{t('teacher:dashboard.emptyState.description')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recentSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="px-4 sm:px-6 lg:px-8 xl:px-10 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                // Navigate to the specific submission detail page
                const url = `/teacher/submissions/${submission.id}/view`;
                window.location.href = url;
              }}
            >
              {/* Mobile Layout */}
              <div className="lg:hidden space-y-3">
                {/* Row 1: Student + Score */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {submission.student?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {submission.student?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{submission.student?.email || ''}</p>
                    </div>
                  </div>
                  {getScoreDisplay(submission.normalizedScore)}
                </div>

                {/* Row 2: Assignment */}
                <div>
                  <p className="text-sm font-medium text-foreground">{submission.assignmentArea.name}</p>
                </div>

                {/* Row 3: Course + Time */}
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span className="truncate">{submission.assignmentArea.course.name}</span>
                  <span className="whitespace-nowrap flex-shrink-0">{formatTimeAgo(submission.uploadedAt)}</span>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
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
