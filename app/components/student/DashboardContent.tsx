import { CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface DashboardData {
  student: { id: string; email: string; role: string; name: string };
  assignments: any[];
  submissions: any[];
}

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { student, assignments, submissions } = data;
  const { t } = useTranslation(['course', 'dashboard', 'submissions']);
  
  // Separate assignments into different categories
  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.submissions.some((sub: any) => sub.studentId === student.id)
  );

  // Get upcoming deadlines
  const upcomingDeadlines = pendingAssignments
    .filter((assignment) => assignment.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {t('dashboard:welcome')}, {student.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                {pendingAssignments.length > 0
                  ? `您有 ${pendingAssignments.length} 個待交作業`
                  : '您已完成所有作業！'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Upcoming Deadlines */}
        <div className="bg-background">
          {/* Header */}
          <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t('dashboard:upcomingDeadlines')}</h2>
              <Badge variant="secondary">{upcomingDeadlines.length}</Badge>
            </div>
          </div>

          {/* Content */}
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-12 md:py-16 lg:py-20 px-6">
              <CheckCircle className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
              <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
                {t('dashboard:emptyState.noUpcomingDeadlines')}
              </h3>
              <p className="mt-2 md:mt-4 text-base md:text-lg text-muted-foreground">
                {t('dashboard:emptyState.allCaughtUp')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upcomingDeadlines.map((assignment) => (
                <div
                  key={assignment.id}
                  className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors"
                >
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
                          {t('course:assignment.due')} {assignment.formattedDueDate}
                        </Badge>
                      </div>
                      <Button asChild size="sm">
                        <Link to={`/student/assignments/${assignment.id}/submit`}>
                          {t('dashboard:actions.submit')} <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
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
                <Badge variant="outline">{submissions.length}</Badge>
              </div>
              <Button asChild variant="ghost" size="sm" className="hover:bg-primary/10">
                <Link to="/student/submissions">
                  {t('dashboard:viewSubmissions')} <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Content */}
          {submissions.length === 0 ? (
            <div className="text-center py-12 md:py-16 lg:py-20 px-6">
              <FileText className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
              <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
                {t('dashboard:emptyState.noSubmissions')}
              </h3>
              <p className="mt-2 md:mt-4 text-base md:text-lg text-muted-foreground">
                {t('dashboard:emptyState.noSubmissionsDescription')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {submissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{submission.assignmentArea.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{submission.assignmentArea.course.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('submissions:teacher.submissionInfo.submitted')} {submission.formattedUploadedDate}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            submission.status === 'GRADED'
                              ? 'default'
                              : submission.status === 'ANALYZED'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {t(`submissions:status.${submission.status.toLowerCase()}`)}
                        </Badge>
                      </div>
                      {submission.finalScore !== null && (
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                          <span className="text-sm font-medium">{submission.finalScore}</span>
                          <span className="text-xs ml-1">分</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}