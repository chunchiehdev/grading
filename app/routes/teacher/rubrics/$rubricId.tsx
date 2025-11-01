import { Link, useLoaderData, useActionData, Form, redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Download, Share2, FileText, Clock, Target, Trash2, Folder, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { dbCriteriaToUICategories, calculateRubricStats } from '@/utils/rubric-transform';

export const loader = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  const rubricId = params.rubricId;

  if (!rubricId) {
    throw new Response('Rubric ID not found', { status: 404 });
  }

  const { getRubric } = await import('@/services/rubric.server');
  const { rubric, error } = await getRubric(rubricId);

  if (error || !rubric) {
    console.error('Error loading rubric:', error);
    throw new Response(error || 'Rubric not found', { status: 404 });
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
        throw new Response(firstError.message || 'Invalid rubric ID', { status: 400 });
      }

      const { id } = validationResult.data;

      const { deleteRubric } = await import('@/services/rubric.server');
      const result = await deleteRubric(id);

      if (!result.success) {
        console.error('Delete rubric failed:', result.error);

        return Response.json(
          {
            success: false,
            error: result.error || 'Failed to delete rubric',
          },
          { status: 409 }
        );
      }

      return redirect('/teacher/rubrics');
    }

    throw new Response('Invalid intent', { status: 400 });
  } catch (error) {
    console.error('Action error:', error);

    if (error instanceof Response) {
      throw error;
    }

    throw new Response(error instanceof Error ? error.message : 'Error processing request', { status: 500 });
  }
};

const LEVEL_COLORS = {
  4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  3: 'bg-blue-100 text-blue-800 border-blue-200',
  2: 'bg-amber-100 text-amber-800 border-amber-200',
  1: 'bg-red-100 text-red-800 border-red-200',
};

export default function RubricDetailRoute() {
  const { t } = useTranslation(['rubric', 'common']);
  const { rubric } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ success: boolean; error?: string }>();

  const categories = rubric.categories ? rubric.categories : dbCriteriaToUICategories(rubric.criteria);
  const stats = calculateRubricStats(categories);

  const handleExport = () => {
    // Export functionality to be implemented
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
      alert(t('rubric:linkCopied'));
    }
  };

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={rubric.name}
        subtitle={rubric.description}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* 主要按鈕 - 永遠顯示 */}
            <Button asChild className="sm:order-last">
              <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> {t('rubric:edit')}
              </Link>
            </Button>

            {/* 次要按鈕 - 手機上隱藏，桌面顯示 */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> {t('rubric:share')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> {t('rubric:export')}
              </Button>
              <Form method="post" className="inline">
                <input type="hidden" name="intent" value="delete" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(t('rubric:confirmDeleteRubric', { rubricName: rubric.name }))) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {t('common:delete')}
                </Button>
              </Form>
            </div>

            {/* 手機版 - More 按鈕 */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <MoreHorizontal className="mr-2 h-4 w-4" /> {t('common:more')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" /> {t('rubric:share')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> {t('rubric:export')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (confirm(t('rubric:confirmDeleteRubric', { rubricName: rubric.name }))) {
                        const form = document.createElement('form');
                        form.method = 'post';
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'intent';
                        input.value = 'delete';
                        form.appendChild(input);
                        document.body.appendChild(form);
                        form.submit();
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t('common:delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
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
                  <div className="font-medium text-destructive mb-1">{t('rubric:cannotDeleteRubric')}</div>
                  <p className="text-sm text-destructive/80">{actionData.error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('rubric:totalCategories')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalCategories}</p>
                </div>
                <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('rubric:totalCriteria')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalCriteria}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta details */}
        <Card className="bg-card text-card-foreground border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> {t('rubric:basicInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('rubric:createdAt')}</div>
              <div className="font-medium">
                {format(new Date(rubric.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhTW })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('rubric:updatedAt')}</div>
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
                <h3 className="text-lg font-semibold mb-2">{t('rubric:emptyState.noCriteriaTitle')}</h3>
                <p className="text-muted-foreground mb-4">{t('rubric:emptyState.noCriteriaDescription')}</p>
                <Button asChild>
                  <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('rubric:startEditing')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((category, categoryIndex) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                        {categoryIndex + 1}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {category.criteria.length} {t('rubric:criteriaCount', { count: category.criteria.length })}
                      </Badge>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {t('rubric:maxScore', { score: category.criteria.length * 4 })}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {category.criteria.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {t('rubric:emptyState.categoryNoCriteria')}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {category.criteria.map((criterion, criterionIndex) => (
                        <div key={criterion.id} className="p-4 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base sm:text-lg">
                                {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                              </h4>
                              {criterion.description && (
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{criterion.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0 self-start">
                              {t('rubric:maxPoints', { points: 4 })}
                            </Badge>
                          </div>

                          {/* 評分等級 */}
                          <div className="space-y-2 sm:space-y-3">
                            <h5 className="font-medium text-sm text-muted-foreground">{t('rubric:gradingLevels')}</h5>
                            <div className="grid gap-2 sm:gap-3">
                              {[4, 3, 2, 1].map((score) => {
                                const level = criterion.levels.find((l) => l.score === score);
                                const description = level?.description || '';

                                return (
                                  <div key={score} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 border">
                                    <Badge
                                      className={`${LEVEL_COLORS[score as keyof typeof LEVEL_COLORS]} border shrink-0 text-xs whitespace-nowrap`}
                                      variant="outline"
                                    >
                                      {score}
                                      {t('common:points')} - {t(`rubric:levelLabels.${score}`)}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      {description ? (
                                        <p className="text-sm leading-relaxed">{description}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">
                                          {t('rubric:noLevelDescription')}
                                        </p>
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
