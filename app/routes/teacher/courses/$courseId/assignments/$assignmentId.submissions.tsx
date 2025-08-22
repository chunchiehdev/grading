import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { ArrowLeft, Download, Eye, FileText, User, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getAssignmentAreaById } from '@/services/assignment-area.server';
import { listSubmissionsByAssignment, type SubmissionInfo } from '@/services/submission.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  assignmentArea: {
    id: string;
    name: string;
    description: string | null;
    courseId: string;
    dueDate: Date | null;
    course?: {
      id: string;
      name: string;
    };
    rubric?: {
      id: string;
      name: string;
    };
    _count?: {
      submissions: number;
    };
  };
  submissions: SubmissionInfo[];
  stats: {
    total: number;
    graded: number;
    pending: number;
    analyzed: number;
  };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;

  if (!courseId || !assignmentId) {
    throw new Response('Course ID and Assignment ID are required', { status: 400 });
  }

  const [assignmentArea, submissions] = await Promise.all([
    getAssignmentAreaById(assignmentId, teacher.id),
    listSubmissionsByAssignment(assignmentId, teacher.id),
  ]);

  if (!assignmentArea) {
    throw new Response('Assignment area not found', { status: 404 });
  }

  // Calculate submission statistics
  const stats = {
    total: submissions.length,
    graded: submissions.filter(s => s.status === 'GRADED').length,
    analyzed: submissions.filter(s => s.status === 'ANALYZED').length,
    pending: submissions.filter(s => s.status === 'SUBMITTED').length,
  };

  return { teacher, assignmentArea, submissions, stats };
}

export default function AssignmentSubmissions() {
  const { teacher, assignmentArea, submissions, stats } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'GRADED':
        return <Badge variant="default" className="text-xs">{t('status.graded')}</Badge>;
      case 'ANALYZED':
        return <Badge variant="secondary" className="text-xs">{t('status.analyzed')}</Badge>;
      case 'SUBMITTED':
        return <Badge variant="outline" className="text-xs">{t('status.pending')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{t(`status.${status.toLowerCase()}`) || status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'GRADED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ANALYZED':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/manage`}>
          {t('teacher.actions.manageAssignment')}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${assignmentArea.courseId}`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('teacher.actions.backToCourse')}
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={`${assignmentArea.name} - ${t('teacher.title')}`}
        subtitle={t('teacher.subtitle')}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Submission Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title={t('teacher.stats.totalSubmissions')}
              value={stats.total}
              icon={FileText}
              variant="transparent"
            />
            <StatsCard
              title={t('teacher.stats.graded')}
              value={stats.graded}
              icon={CheckCircle}
              variant="transparent"
            />
            <StatsCard
              title={t('teacher.stats.analyzed')}
              value={stats.analyzed}
              icon={Eye}
              variant="transparent"
            />
            <StatsCard
              title={t('teacher.stats.pendingReview')}
              value={stats.pending}
              icon={Clock}
              variant="transparent"
            />
          </div>

          {/* Submissions List */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('teacher.studentSubmissions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">{t('teacher.emptyState.noSubmissions')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('teacher.emptyState.noSubmissionsDescription')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {submission.student?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-foreground">
                                {submission.student?.name || 'Unknown Student'}
                              </h3>
                              {getStatusBadge(submission.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {submission.student?.email || 'No email'}
                            </p>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{t('teacher.submissionInfo.submitted')} {formatDate(submission.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Status Icon */}
                          <div className="flex items-center gap-1">
                            {getStatusIcon(submission.status)}
                          </div>

                          {/* Final Score */}
                          {submission.finalScore !== null && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-foreground">
                                {t('teacher.submissionInfo.score')}: {submission.finalScore}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/student/assignments/${assignmentArea.id}/submit`}>
                                <Eye className="h-4 w-4 mr-1" />
                                {t('teacher.actions.view')}
                              </Link>
                            </Button>
                            {submission.filePath && (
                              <Button asChild variant="ghost" size="sm">
                                <a href={submission.filePath} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" />
                                  {t('teacher.actions.download')}
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Teacher Feedback */}
                      {submission.teacherFeedback && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <h4 className="text-sm font-medium text-foreground mb-1">{t('teacher.feedback.teacherFeedback')}</h4>
                          <p className="text-sm text-muted-foreground">{submission.teacherFeedback}</p>
                        </div>
                      )}

                      {/* AI Analysis Summary */}
                      {submission.aiAnalysisResult && (
                        <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                          <h4 className="text-sm font-medium text-foreground mb-1">{t('teacher.feedback.aiAnalysisAvailable')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t('teacher.feedback.aiAnalysisDescription')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle>{t('teacher.assignmentDetails.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground">{t('teacher.assignmentDetails.assignmentName')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('teacher.assignmentDetails.course')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.course?.name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('teacher.assignmentDetails.gradingRubric')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.rubric?.name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('teacher.assignmentDetails.dueDate')}</h4>
                  <p className="text-muted-foreground">
                    {assignmentArea.dueDate ? formatDate(assignmentArea.dueDate) : t('teacher.assignmentDetails.noDueDate')}
                  </p>
                </div>
              </div>
              
              {assignmentArea.description && (
                <div>
                  <h4 className="font-medium text-foreground">{t('teacher.assignmentDetails.description')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
