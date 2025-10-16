import { CheckCircle, Newspaper } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { AnimatedArrowButton } from '@/components/ui/animated-arrow-button';
import { useTranslation } from 'react-i18next';
import { useAssignmentStore } from '@/stores/assignmentStore';
import type { StudentInfo } from '@/types/student';

interface DashboardContentProps {
  data: {
    student: StudentInfo;
    assignments: any[];
    submissions: any[];
  };
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { student, submissions } = data;
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);

  // Subscribe to assignment store (initialized by parent component)
  const getUpcomingDeadlines = useAssignmentStore((state) => state.getUpcomingDeadlines);

  // Get upcoming deadlines from store (includes sorting logic)
  const upcomingDeadlines = getUpcomingDeadlines(student.id);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Main Content Area */}

      <div className="space-y-8 md:space-y-12">
        {/* Upcoming Deadlines */}
        <div className="bg-background">
          {/* Header */}
          <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t('dashboard:upcomingDeadlines')}</h2>
            </div>
          </div>

          {/* Content */}
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-12 md:py-16 lg:py-20 px-6">
              <CheckCircle className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
              <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
                {t('dashboard:emptyState.noUpcomingDeadlines')}
              </h3>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upcomingDeadlines.map((assignment) => (
                <div key={assignment.id} className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{assignment.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{assignment.course.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {t('course:teacher')}: {assignment.course.teacher.email}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="text-xs">
                          {t('course:assignment.dueDate')} {assignment.formattedDueDate}
                        </Badge>
                      </div>
                      <AnimatedArrowButton
                        to={`/student/assignments/${assignment.id}/submit`}
                        className="text-sm px-4 py-2"
                      >
                        {t('dashboard:actions.submit')}
                      </AnimatedArrowButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="bg-background">
          {/* Header */}
          <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">{t('dashboard:recentSubmissions')}</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          {submissions.length === 0 ? (
            <div className="text-center py-12 md:py-16 lg:py-20 px-6">
              <Newspaper className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
              <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
                {t('dashboard:emptyState.noSubmissions')}
              </h3>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {submissions.slice(0, 5).map((submission) => (
                <Link
                  key={submission.id}
                  to={`/student/submissions/${submission.id}`}
                  className="block px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {submission.assignmentArea.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{submission.assignmentArea.course.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('submissions:teacher.submissionInfo.submitted')} {submission.formattedUploadedDate}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-2"></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
