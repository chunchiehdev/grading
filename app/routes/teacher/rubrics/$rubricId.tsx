import { Link, useLoaderData, useActionData, Form, redirect, useRouteError, isRouteErrorResponse } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Edit, FileText, Download, Share2, Trash2, Home } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header - Modern Soft UI Style */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {rubric.name}
              </h1>
              {rubric.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">{rubric.description}</p>
              )}
            </div>
            <Link
              to={`/teacher/rubrics/${rubric.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:shadow-md flex-shrink-0"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">{t('rubric:edit')}</span>
            </Link>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {t('rubric:share')}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('rubric:export')}
            </button>
            <Form method="post" className="inline">
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm(t('rubric:confirmDeleteRubric', { rubricName: rubric.name }))) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('common:delete')}
              </button>
            </Form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error notice */}
        {actionData?.error && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-start gap-3">
              <div>
                <div className="mb-1 font-semibold text-destructive">
                  {t('rubric:cannotDeleteRubric')}
                </div>
                <p className="text-sm text-muted-foreground">{actionData.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Categories and criteria */}
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 sm:p-16 text-center shadow-sm border border-border/50">
            <FileText className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground">
              {t('rubric:emptyState.noCriteriaTitle')}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
              {t('rubric:emptyState.noCriteriaDescription')}
            </p>
            <Link
              to={`/teacher/rubrics/${rubric.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 sm:px-6 py-2 sm:py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
            >
              <Edit className="h-4 w-4" />
              {t('rubric:startEditing')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category, categoryIndex) => (
              <div key={category.id} className="rounded-2xl bg-card shadow-sm border border-border/50 overflow-hidden">
                {/* Category header */}
                <div className="bg-muted/30 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold text-foreground">
                    <span className="text-primary text-base sm:text-lg font-bold flex-shrink-0">
                      {categoryIndex + 1}.
                    </span>
                    <span className="truncate">{category.name}</span>
                  </h3>
                </div>

                {/* Criteria list */}
                {category.criteria.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t('rubric:emptyState.categoryNoCriteria')}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {category.criteria.map((criterion, criterionIndex) => (
                      <div key={criterion.id} className="p-4 sm:p-6 hover:bg-muted/20 transition-colors">
                        <div className="mb-4">
                          <h4 className="text-sm sm:text-base font-semibold text-foreground">
                            <span className="text-muted-foreground font-normal text-xs sm:text-sm">
                              {categoryIndex + 1}.{criterionIndex + 1}
                            </span>
                            {' '}
                            {criterion.name}
                          </h4>
                          {criterion.description && (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {criterion.description}
                            </p>
                          )}
                        </div>

                        {/* Grading levels - Modern Card Style */}
                        <div className="mt-4">
                          <h5 className="mb-2 sm:mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('rubric:gradingLevels')}
                          </h5>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            {[4, 3, 2, 1].map((score) => {
                              const level = criterion.levels.find((l) => l.score === score);
                              const description = level?.description || '';
                              const isTopLevel = score === 4;

                              return (
                                <div
                                  key={score}
                                  className={`group rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all ${
                                    isTopLevel
                                      ? 'bg-[#D2691E]/10 dark:bg-[#E87D3E]/10 border-2 border-[#D2691E]/30 dark:border-[#E87D3E]/30 hover:border-[#D2691E]/50 dark:hover:border-[#E87D3E]/50 shadow-sm'
                                      : 'bg-muted/50 border border-border/50 hover:border-border hover:bg-muted/70'
                                  }`}
                                >
                                  <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                                    <span
                                      className={`text-xl sm:text-2xl font-bold ${
                                        isTopLevel
                                          ? 'text-[#D2691E] dark:text-[#E87D3E]'
                                          : 'text-foreground/70'
                                      }`}
                                    >
                                      {score}
                                    </span>
                                    <span className={`text-[10px] sm:text-xs font-medium ${
                                      isTopLevel ? 'text-[#D2691E] dark:text-[#E87D3E]' : 'text-muted-foreground'
                                    }`}>
                                      {t(`rubric:levelLabels.${score}`)}
                                    </span>
                                  </div>
                                  <div>
                                    {description ? (
                                      <p className={`text-[11px] sm:text-xs leading-relaxed line-clamp-4 sm:line-clamp-3 ${
                                        isTopLevel ? 'text-foreground/80' : 'text-muted-foreground'
                                      }`}>
                                        {description}
                                      </p>
                                    ) : (
                                      <p className="text-[11px] sm:text-xs italic text-muted-foreground/50">
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation(['common']);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-6xl font-bold text-foreground">
              404
            </h1>
            <p className="text-muted-foreground text-lg">
              找不到此評分標準
            </p>
          </div>
          <Link
            to="/teacher/rubrics"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
          >
            <Home className="h-4 w-4" />
            返回評分標準列表
          </Link>
        </div>
      </div>
    );
  }

  // Handle other errors
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-4">
            <FileText className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            錯誤
          </h1>
          <p className="text-muted-foreground">
            載入評分標準時發生錯誤，請稍後再試
          </p>
        </div>
        <Link
          to="/teacher/rubrics"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
        >
          <Home className="h-4 w-4" />
          返回評分標準列表
        </Link>
      </div>
    </div>
  );
}
