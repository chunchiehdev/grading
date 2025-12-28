/**
 * Teacher Agent Review Queue
 *
 * Page for teachers to review low-confidence Agent grading results
 */

import { useRouteError, isRouteErrorResponse, redirect } from 'react-router';
import type { Route } from './+types/teacher.agent-review';
import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { AgentExecutionTimeline, AgentExecutionSummary } from '@/components/grading/AgentExecutionTimeline';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Eye, XCircle } from 'lucide-react';

/**
 * Loader - fetch grading results that require review
 */
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect('/auth/login');
  }

  // Get user role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== 'TEACHER') {
    return redirect('/');
  }

  // Parse query params
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'pending';

  // Build where clause
  const where: any = {
    agentModel: { not: null }, // Only Agent-graded results
  };

  if (filter === 'pending') {
    where.requiresReview = true;
    where.reviewedBy = null;
  } else if (filter === 'reviewed') {
    where.reviewedBy = { not: null };
  } else if (filter === 'all') {
    where.requiresReview = true;
  }

  // Fetch results
  const results = await db.gradingResult.findMany({
    where,
    include: {
      uploadedFile: {
        select: {
          id: true,
          originalFileName: true,
          parsedContent: true,
        },
      },
      rubric: {
        select: {
          id: true,
          name: true,
        },
      },
      gradingSession: {
        select: {
          id: true,
          userId: true,
        },
      },
      assignmentArea: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { requiresReview: 'desc' },
      { confidenceScore: 'asc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  });

  // Get statistics
  const [totalPending, totalReviewed, avgConfidence] = await Promise.all([
    db.gradingResult.count({
      where: {
        agentModel: { not: null },
        requiresReview: true,
        reviewedBy: null,
      },
    }),
    db.gradingResult.count({
      where: {
        agentModel: { not: null },
        reviewedBy: { not: null },
      },
    }),
    db.gradingResult.aggregate({
      where: { agentModel: { not: null } },
      _avg: { confidenceScore: true },
    }),
  ]);

  return {
    results,
    stats: {
      totalPending,
      totalReviewed,
      avgConfidence: avgConfidence._avg.confidenceScore || 0,
    },
    filter,
  };
}

/**
 * Action - approve or reject grading
 */
export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get('action');
  const resultId = formData.get('resultId') as string;

  if (!resultId) {
    return Response.json({ error: 'Missing resultId' }, { status: 400 });
  }

  if (action === 'approve') {
    // Approve the grading
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        requiresReview: false,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return Response.json({ success: true, message: '已批准評分' });
  } else if (action === 'reject') {
    // Mark for re-grading (set status back to PENDING)
    await db.gradingResult.update({
      where: { id: resultId },
      data: {
        status: 'PENDING',
        requiresReview: false,
        reviewedBy: userId,
        reviewedAt: new Date(),
        result: undefined,
        agentSteps: undefined,
        toolCalls: undefined,
        confidenceScore: undefined,
      },
    });

    return Response.json({ success: true, message: '已標記為待重新評分' });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

/**
 * Component
 */
export default function AgentReviewQueue({ loaderData }: Route.ComponentProps) {
  const { results, stats, filter } = loaderData;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Agent 評分審核</h1>
        <p className="text-muted-foreground">
          檢查信心度較低的 AI 評分結果，確保評分準確性
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>待審核</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-500" />
              {stats.totalPending}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>已審核</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              {stats.totalReviewed}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>平均信心度</CardDescription>
            <CardTitle className="text-3xl">
              {(stats.avgConfidence * 100).toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={filter} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending" asChild>
            <a href="?filter=pending">待審核</a>
          </TabsTrigger>
          <TabsTrigger value="reviewed" asChild>
            <a href="?filter=reviewed">已審核</a>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <a href="?filter=all">全部</a>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results list */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium mb-2">沒有需要審核的評分</p>
            <p className="text-muted-foreground">
              {filter === 'pending' ? '所有評分都已完成審核！' : '目前沒有符合條件的評分記錄'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      {result.uploadedFile.originalFileName}
                    </CardTitle>
                    <CardDescription>
                      評分標準：{result.rubric.name}
                      {result.assignmentArea && ` · ${result.assignmentArea.name}`}
                    </CardDescription>
                    {result.agentSteps && (
                      <div className="mt-2">
                        <AgentExecutionSummary
                          steps={result.agentSteps as any}
                          confidenceScore={result.confidenceScore || undefined}
                          requiresReview={result.requiresReview}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {result.reviewedBy ? (
                      <Badge variant="secondary">已審核</Badge>
                    ) : (
                      <Badge variant="destructive">待審核</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Grading result */}
                {result.result && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">評分結果</h4>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">總分</p>
                          <p className="text-2xl font-bold">
                            {(result.result as any).totalScore || 0} /{' '}
                            {(result.result as any).maxScore || 100}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">百分比</p>
                          <p className="text-2xl font-bold">
                            {result.normalizedScore?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">整體評語</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {(result.result as any).overallFeedback}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent execution timeline */}
                {result.agentSteps && (
                  <AgentExecutionTimeline
                    steps={result.agentSteps as any}
                    confidenceScore={result.confidenceScore || undefined}
                    requiresReview={result.requiresReview}
                    totalExecutionTimeMs={result.agentExecutionTime || undefined}
                  />
                )}

                {/* Action buttons */}
                {!result.reviewedBy && (
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <form method="post" className="flex-1">
                      <input type="hidden" name="resultId" value={result.id} />
                      <input type="hidden" name="action" value="approve" />
                      <Button type="submit" className="w-full" variant="default">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        批准評分
                      </Button>
                    </form>

                    <form method="post" className="flex-1">
                      <input type="hidden" name="resultId" value={result.id} />
                      <input type="hidden" name="action" value="reject" />
                      <Button type="submit" className="w-full" variant="destructive">
                        <XCircle className="w-4 h-4 mr-2" />
                        重新評分
                      </Button>
                    </form>

                    <Button variant="outline" asChild>
                      <a
                        href={`/teacher/grading/${result.gradingSession.id}/result/${result.id}`}
                        target="_blank"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        查看詳情
                      </a>
                    </Button>
                  </div>
                )}

                {/* Review info */}
                {result.reviewedBy && result.reviewedAt && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    已於 {new Date(result.reviewedAt).toLocaleString('zh-TW')} 審核
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action feedback - TODO: Fix actionData typing */}
      {/* {actionData && 'success' in actionData && actionData.success && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          {actionData.message}
        </div>
      )} */}
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/teacher" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/teacher" />;
}
