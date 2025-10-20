import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionById } from '@/services/submission.server';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { useTranslation } from 'react-i18next';
import { RotateCcw, ArrowLeft } from 'lucide-react';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const submissionId = params.submissionId as string;
  const submission = await getSubmissionById(submissionId, student.id);
  if (!submission) {
    throw new Response('Submission not found', { status: 404 });
  }
  return { student, submission };
}

export default function StudentSubmissionDetail() {
  const { submission } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['submissions']);
  const a = submission.assignmentArea;
  console.log('submission', submission);
  const renderStatus = (status?: string) => {
    const normalized = (status || '').toUpperCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let label = status || 'Unknown';
    switch (normalized) {
      case 'GRADED':
        variant = 'default';
        label = 'Graded';
        break;
      case 'ANALYZED':
      case 'PENDING':
        variant = 'secondary';
        label = 'Pending';
        break;
      case 'SUBMITTED':
        variant = 'outline';
        label = 'Submitted';
        break;
      case 'FAILED':
        variant = 'destructive';
        label = 'Failed';
        break;
    }
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-6 lg:px-12 xl:px-16 2xl:px-20 pb-8 space-y-8">
        {/* 返回按鈕 */}
        <div className="pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/student/submissions" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('common:back')}
            </Link>
          </Button>
        </div>

        {/* 頂部作業資訊 - 簡潔背景 */}
        <div className="border-b border-border pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl xl:text-3xl font-bold mb-2">{a.name}</h1>
              <p className="text-muted-foreground">{a.course.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                提交時間: {new Date(submission.uploadedAt).toLocaleString()}
              </p>
            </div>

            {/* 右側：分數 + 重新繳交按鈕 */}
            <div className="flex items-start gap-4">
              {/* 分數 - 學生最關心的信息 */}
              <div className="text-right">
                {submission.normalizedScore !== null ? (
                  <div className="bg-muted text-muted-foreground rounded-full px-6 py-3">
                    <span className="text-3xl font-bold">{submission.normalizedScore.toFixed(1)}</span>
                    <span className="text-lg ml-1">/ 100</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-right">
                    <div className="text-lg">尚未評分</div>
                  </div>
                )}
              </div>

              {/* 重新繳交按鈕 - 僅未評分時顯示 */}
              {submission.status !== 'GRADED' && submission.status !== 'ANALYZED' && (
                <Link to={`/student/assignments/${submission.assignmentAreaId}/submit`}>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('submissions:resubmit')}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 作業描述 */}
          {a.description && (
            <div className="mt-6 p-4 bg-muted/20 rounded-lg">
              <h3 className="font-medium mb-2">作業說明</h3>
              <p className="text-sm text-muted-foreground">{a.description}</p>
            </div>
          )}
        </div>

        {/* AI分析結果 - 移除垂直線，更簡潔 */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">{t('submissions:aiAnalysis.title')}</h2>
          <div>
            {submission.aiAnalysisResult ? (
              <GradingResultDisplay
                result={submission.aiAnalysisResult as any}
                normalizedScore={submission.normalizedScore}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">AI分析進行中...</p>
              </div>
            )}
          </div>
        </section>

        {/* 教師評語 */}
        {submission.teacherFeedback && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">教師評語</h2>
            <div className="bg-muted/30 rounded-lg p-6">
              <p className="whitespace-pre-wrap leading-relaxed">{submission.teacherFeedback}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
