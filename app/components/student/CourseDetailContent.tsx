import { FileText, CheckCircle, Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import type { StudentCourseDetailData } from '@/services/student-course-detail.server';

interface CourseDetailContentProps {
  data: StudentCourseDetailData & {
    student: { id: string; email: string; role: string };
  };
}

export function CourseDetailContent({ data }: CourseDetailContentProps) {
  const { t } = useTranslation(['course', 'assignment', 'common']);
  const { course, myClass, enrolledAt, assignments, stats, student } = data;

  // Format enrolled date
  const formattedEnrolledDate = new Date(enrolledAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">作業總數</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">待繳交</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均分數</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.averageScore !== null ? Math.round(stats.averageScore) : 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            課程資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Teacher Info */}
          <div className="flex items-center gap-4">
            <img
              src={course.teacher.picture}
              alt={course.teacher.name}
              className="w-12 h-12 rounded-full object-cover bg-muted"
            />
            <div>
              <div className="text-base font-medium text-foreground">{course.teacher.name}</div>
              <div className="text-sm text-muted-foreground">{course.teacher.email}</div>
            </div>
            <Badge variant="secondary" className="ml-auto">教師</Badge>
          </div>

          {/* My Class */}
          {myClass && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">我的班級</p>
                  <p className="text-base font-semibold text-foreground">{myClass.name}</p>
                  {myClass.schedule && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {myClass.schedule.day} {myClass.schedule.startTime}-{myClass.schedule.endTime}
                      {myClass.schedule.room && ` • ${myClass.schedule.room}`}
                    </p>
                  )}
                </div>
                <Badge variant="outline">班級成員</Badge>
              </div>
            </div>
          )}

          {/* Enrolled Date */}
          <div className="border-t pt-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>加入日期：{formattedEnrolledDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Assignments / Course Info */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="assignments">作業列表</TabsTrigger>
          <TabsTrigger value="info">課程資訊</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">尚無作業</h3>
                <p className="text-muted-foreground">此課程尚未發布任何作業</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
              {assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} studentId={student.id} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>課程描述</CardTitle>
            </CardHeader>
            <CardContent>
              {course.description ? (
                <p className="text-foreground whitespace-pre-wrap">{course.description}</p>
              ) : (
                <p className="text-muted-foreground">教師尚未提供課程描述</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Assignment Card Component (reused from AssignmentsContent)
interface AssignmentCardProps {
  assignment: any; // StudentAssignmentInfo
  studentId: string;
}

function AssignmentCard({ assignment, studentId }: AssignmentCardProps) {
  const { t } = useTranslation('assignment');
  const hasSubmission = assignment.submissions.some((sub: any) => sub.studentId === studentId);
  const submission = assignment.submissions.find((sub: any) => sub.studentId === studentId);

  const getStatusBadge = () => {
    if (hasSubmission) {
      if (submission?.status === 'GRADED') {
        return <Badge variant="default">{t('status.graded')}</Badge>;
      }
      return <Badge variant="secondary">{t('status.submitted')}</Badge>;
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    if (isOverdue) {
      return <Badge variant="destructive">{t('status.overdue')}</Badge>;
    }

    return (
      <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
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
    <Link to={`/student/assignments/${assignment.id}/submit`} className="block">
      <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 h-full grid grid-rows-[1fr_auto_auto_auto]">
        <CardHeader className="p-6 min-h-[140px] flex flex-col justify-start">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {assignment.name}
              </CardTitle>
              {assignment.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{assignment.description}</p>
              )}
            </div>
            <div className="ml-2">{getStatusBadge()}</div>
          </div>
        </CardHeader>

        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {assignment.class && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {assignment.class.name}
                </span>
              )}
              {!assignment.class && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  全課程
                </span>
              )}
            </div>
            {hasSubmission && submission?.finalScore !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-accent-foreground">{submission?.finalScore}</span>
                <span className="text-sm text-muted-foreground">{t('assignmentCard.finalScore')}</span>
              </div>
            ) : hasSubmission ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">{t('assignmentCard.submitted')}</span>
                <span className="text-sm text-muted-foreground">{t('assignmentCard.awaitingGrading')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatDueDate(assignment.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="text-sm text-muted-foreground">
            {t('assignmentCard.rubric')}: {assignment.rubric.name}
          </div>
        </div>

        <div className="mx-2 mb-2 px-4 py-3 bg-muted rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 text-sm">
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
}
