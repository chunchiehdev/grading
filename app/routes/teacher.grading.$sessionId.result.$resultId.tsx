/**
 * Grading Result Detail Page
 *
 * Shows detailed grading results including Agent execution timeline
 */

import { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { db } from '@/lib/db.server';
import { requireTeacher } from '@/services/auth.server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { AgentExecutionTimeline } from '@/components/grading/AgentExecutionTimeline';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireTeacher(request);

  const { sessionId, resultId } = params;

  if (!sessionId || !resultId) {
    throw new Response('Missing sessionId or resultId', { status: 400 });
  }

  const result = await db.gradingResult.findUnique({
    where: { id: resultId },
    include: {
      uploadedFile: {
        select: {
          id: true,
          originalFileName: true,
          parsedContent: true,
          fileKey: true,
        },
      },
      rubric: {
        select: {
          id: true,
          name: true,
          criteria: true,
        },
      },
      gradingSession: {
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
      agentLogs: {
        orderBy: {
          stepNumber: 'asc',
        },
      },
    },
  });

  if (!result) {
    throw new Response('Grading result not found', { status: 404 });
  }

  // Verify session matches
  if (result.gradingSessionId !== sessionId) {
    throw new Response('Session mismatch', { status: 400 });
  }

  return { result };
}

export default function GradingResultDetail() {
  const { result } = useLoaderData<typeof loader>();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }> = {
      COMPLETED: { variant: 'default', text: '已完成' },
      FAILED: { variant: 'destructive', text: '失敗' },
      PENDING: { variant: 'secondary', text: '等待中' },
      PROCESSING: { variant: 'outline', text: '處理中' },
    };
    const config = variants[status] || { variant: 'outline', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const gradingData = result.result as any;
  const hasAgentExecution = result.agentSteps || result.agentLogs?.length > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/teacher/agent-review">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回審核列表
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">評分結果詳情</h1>
            <p className="text-sm text-muted-foreground">
              {result.uploadedFile.originalFileName}
            </p>
          </div>
        </div>
        {getStatusBadge(result.status)}
      </div>

      {/* Grading Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>評分資訊</CardTitle>
          <CardDescription>
            評分標準：{result.rubric.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">狀態</div>
              <div className="font-medium">{getStatusBadge(result.status)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">進度</div>
              <div className="font-medium">{result.progress}%</div>
            </div>
            {result.normalizedScore !== null && (
              <div>
                <div className="text-sm text-muted-foreground">分數</div>
                <div className="font-medium">{result.normalizedScore.toFixed(1)} / 100</div>
              </div>
            )}
            {result.confidenceScore !== null && (
              <div>
                <div className="text-sm text-muted-foreground">信心度</div>
                <div className="font-medium">{(result.confidenceScore * 100).toFixed(0)}%</div>
              </div>
            )}
          </div>

          {result.agentModel && (
            <div>
              <div className="text-sm text-muted-foreground">Agent 模型</div>
              <div className="font-medium">{result.agentModel}</div>
            </div>
          )}

          {result.errorMessage && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="text-sm font-medium text-destructive">錯誤訊息</div>
              <div className="text-sm mt-1">{result.errorMessage}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Results */}
      {gradingData && (
        <Card>
          <CardHeader>
            <CardTitle>評分結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gradingData.breakdown?.map((item: any, idx: number) => (
              <div key={idx} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{item.name || `標準 ${idx + 1}`}</div>
                  <div className="text-sm font-medium">
                    {item.score} / {item.maxScore || '-'}
                  </div>
                </div>
                {item.feedback && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.feedback}
                  </div>
                )}
              </div>
            ))}

            {gradingData.overallFeedback && (
              <div className="mt-4 pt-4 border-t">
                <div className="font-medium mb-2">整體評語</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {gradingData.overallFeedback}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Execution Timeline */}
      {hasAgentExecution && (
        <AgentExecutionTimeline
          steps={result.agentSteps as any}
          confidenceScore={result.confidenceScore ?? undefined}
          totalExecutionTimeMs={result.agentExecutionTime ?? undefined}
        />
      )}

      {/* File Content Preview */}
      {result.uploadedFile.parsedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              作業內容
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {result.uploadedFile.parsedContent}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
