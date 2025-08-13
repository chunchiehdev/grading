import { Link, useLoaderData, useActionData, Form, redirect } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Download, Share2, FileText, Clock, Target, Trash2, Folder, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { dbCriteriaToUICategories, calculateRubricStats } from '@/utils/rubric-transform';

export const loader = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  const rubricId = params.rubricId;

  if (!rubricId) {
    throw new Response('評分標準ID不存在', { status: 404 });
  }

  const { getRubric } = await import('@/services/rubric.server');
  const { rubric, error } = await getRubric(rubricId);

  if (error || !rubric) {
    console.error('Error loading rubric:', error);
    throw new Response(error || '找不到評分標準', { status: 404 });
  }

  return { rubric };
};

export const action = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  try {
    const formData = await request.formData();
    const intent = formData.get('intent');

    if (intent === 'delete') {
      const rubricId = params.rubricId;

      const { DeleteRubricRequestSchema } = await import('@/schemas/rubric');
      const validationResult = DeleteRubricRequestSchema.safeParse({ id: rubricId });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        console.error('Delete validation failed:', validationResult.error.errors);
        throw new Response(firstError.message || '無效的評分標準ID', { status: 400 });
      }

      const { id } = validationResult.data;

      const { deleteRubric } = await import('@/services/rubric.server');
      const result = await deleteRubric(id);

      if (!result.success) {
        console.error('Delete rubric failed:', result.error);

        return Response.json(
          {
            success: false,
            error: result.error || '刪除評分標準失敗',
          },
          { status: 409 }
        );
      }

      console.log('Rubric deleted successfully:', id);
      return redirect('/teacher/rubrics');
    }

    throw new Response('Invalid intent', { status: 400 });
  } catch (error) {
    console.error('Action error:', error);

    if (error instanceof Response) {
      throw error;
    }

    throw new Response(error instanceof Error ? error.message : '處理請求時發生錯誤', { status: 500 });
  }
};

const LEVEL_COLORS = {
  4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  3: 'bg-blue-100 text-blue-800 border-blue-200',
  2: 'bg-amber-100 text-amber-800 border-amber-200',
  1: 'bg-red-100 text-red-800 border-red-200',
};

const LEVEL_LABELS = {
  4: '優秀',
  3: '良好',
  2: '及格',
  1: '需改進',
};

export default function RubricDetailRoute() {
  const { rubric } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ success: boolean; error?: string }>();

  const categories = rubric.categories ? rubric.categories : dbCriteriaToUICategories(rubric.criteria);
  const stats = calculateRubricStats(categories);

  const handleExport = () => {
    console.log('Export rubric:', rubric);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: rubric.name,
        text: rubric.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('連結已複製到剪貼簿');
    }
  };

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={rubric.name}
        subtitle={rubric.description}
        actions={
          <>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 分享
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> 導出
            </Button>
            <Form method="post" className="inline">
              <input type="hidden" name="intent" value="delete" />
              <Button
                type="submit"
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm(`確定要刪除「${rubric.name}」嗎？此操作無法復原。`)) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> 刪除
              </Button>
            </Form>
            <Button asChild>
              <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> 編輯評分標準
              </Link>
            </Button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error notice */}
        {actionData?.error && (
          <Card className="mb-6 bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Trash2 className="h-4 w-4 text-destructive mt-1" />
                <div>
                  <div className="font-medium text-destructive mb-1">無法刪除評分標準</div>
                  <p className="text-sm text-destructive/80">{actionData.error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">評分類別</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalCategories}</p>
                </div>
                <Folder className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">評分標準</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalCriteria}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta details */}
        <Card className="bg-card text-card-foreground border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> 基本資訊
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">建立時間</div>
              <div className="font-medium">
                {format(new Date(rubric.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhTW })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">更新時間</div>
              <div className="font-medium">
                {format(new Date(rubric.updatedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhTW })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories and criteria */}
        <div className="space-y-8">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">尚無評分標準</h3>
                <p className="text-muted-foreground mb-4">此評分標準尚未新增任何評分項目</p>
                <Button asChild>
                  <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    開始編輯
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((category, categoryIndex) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {categoryIndex + 1}
                      </span>
                      {category.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category.criteria.length} 個標準</Badge>
                      <Badge variant="outline">最高 {category.criteria.length * 4} 分</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {category.criteria.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">此類別尚無評分標準</div>
                  ) : (
                    <div className="divide-y">
                      {category.criteria.map((criterion, criterionIndex) => (
                        <div key={criterion.id} className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">
                                {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                              </h4>
                              {criterion.description && (
                                <p className="text-muted-foreground mt-2 leading-relaxed">{criterion.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-4">
                              最高 4 分
                            </Badge>
                          </div>

                          {/* 評分等級 */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-sm text-muted-foreground">評分等級：</h5>
                            <div className="grid gap-3">
                              {[4, 3, 2, 1].map((score) => {
                                const level = criterion.levels.find((l) => l.score === score);
                                const description = level?.description || '';

                                return (
                                  <div key={score} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border">
                                    <Badge
                                      className={`${LEVEL_COLORS[score as keyof typeof LEVEL_COLORS]} border shrink-0`}
                                      variant="outline"
                                    >
                                      {score}分 - {LEVEL_LABELS[score as keyof typeof LEVEL_LABELS]}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      {description ? (
                                        <p className="text-sm leading-relaxed">{description}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">尚未設定此等級的描述</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
