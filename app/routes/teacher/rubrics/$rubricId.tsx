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
    <div className="min-h-screen">
      {/* Header - Architectural Sketch Style */}
      <header className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                {rubric.name}
              </h1>
              {rubric.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{rubric.description}</p>
              )}
            </div>
            <Link
              to={`/teacher/rubrics/${rubric.id}/edit`}
              className="border-2 border-[#2B2B2B] px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#D2691E] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-[#E87D3E]"
            >
              <Edit className="mr-2 inline-block h-4 w-4" />
              {t('rubric:edit')}
            </Link>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <button
              onClick={handleShare}
              className="text-gray-600 underline-offset-4 hover:text-[#2B2B2B] hover:underline dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Share2 className="mr-1 inline-block h-4 w-4" />
              {t('rubric:share')}
            </button>
            <button
              onClick={handleExport}
              className="text-gray-600 underline-offset-4 hover:text-[#2B2B2B] hover:underline dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Download className="mr-1 inline-block h-4 w-4" />
              {t('rubric:export')}
            </button>
            <Form method="post" className="inline">
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                className="text-[#D2691E] underline-offset-4 hover:underline dark:text-[#E87D3E]"
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm(t('rubric:confirmDeleteRubric', { rubricName: rubric.name }))) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              >
                <Trash2 className="mr-1 inline-block h-4 w-4" />
                {t('common:delete')}
              </button>
            </Form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Statistics - Sketch Cards */}
        <div className="mb-12 grid grid-cols-2 gap-6">
          <div className="border-2 border-[#2B2B2B] p-6 dark:border-gray-200">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('rubric:totalCategories')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              {stats.totalCategories}
            </p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {t('rubric:totalCriteria')}
            </p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              {stats.totalCriteria}
            </p>
          </div>
        </div>

        {/* Error notice */}
        {actionData?.error && (
          <div className="mb-8 border-2 border-[#D2691E] bg-[#D2691E]/5 p-6 dark:border-[#E87D3E]">
            <div className="flex items-start gap-3">
              <div>
                <div className="mb-1 font-medium text-[#D2691E] dark:text-[#E87D3E]">
                  {t('rubric:cannotDeleteRubric')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{actionData.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Categories and criteria */}
        {categories.length === 0 ? (
          <div className="border-2 border-[#2B2B2B] px-6 py-16 text-center dark:border-gray-200">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mb-2 font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
              {t('rubric:emptyState.noCriteriaTitle')}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {t('rubric:emptyState.noCriteriaDescription')}
            </p>
            <Link
              to={`/teacher/rubrics/${rubric.id}/edit`}
              className="inline-block border-2 border-[#2B2B2B] px-6 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#D2691E] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-[#E87D3E]"
            >
              <Edit className="mr-2 inline-block h-4 w-4" />
              {t('rubric:startEditing')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category, categoryIndex) => (
              <div key={category.id} className="border-2 border-[#2B2B2B] dark:border-gray-200">
                {/* Category header */}
                <div className="border-b-2 border-[#2B2B2B] px-6 py-4 dark:border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-3 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-[#2B2B2B] font-sans text-sm dark:border-gray-200">
                        {categoryIndex + 1}
                      </span>
                      {category.name}
                    </h3>
                    <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>
                        {category.criteria.length} {t('rubric:criteriaCount', { count: category.criteria.length })}
                      </span>
                      <span>·</span>
                      <span>{t('rubric:maxScore', { score: category.criteria.length * 4 })}</span>
                    </div>
                  </div>
                </div>

                {/* Criteria list */}
                {category.criteria.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                    {t('rubric:emptyState.categoryNoCriteria')}
                  </div>
                ) : (
                  <div>
                    {category.criteria.map((criterion, criterionIndex) => (
                      <div
                        key={criterion.id}
                        className={`p-6 ${
                          criterionIndex < category.criteria.length - 1
                            ? 'border-b border-[#2B2B2B] dark:border-gray-200'
                            : ''
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-serif text-base font-light text-[#2B2B2B] dark:text-gray-100">
                              {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                            </h4>
                            {criterion.description && (
                              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                {criterion.description}
                              </p>
                            )}
                          </div>
                          <span className="ml-4 flex-shrink-0 text-xs text-gray-600 dark:text-gray-400">
                            {t('rubric:maxPoints', { points: 4 })}
                          </span>
                        </div>

                        {/* Grading levels - Architectural Sketch Style */}
                        <div className="mt-4">
                          <h5 className="mb-3 text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            {t('rubric:gradingLevels')}
                          </h5>
                          <div className="space-y-3">
                            {[4, 3, 2, 1].map((score) => {
                              const level = criterion.levels.find((l) => l.score === score);
                              const description = level?.description || '';
                              const isTopLevel = score === 4;

                              return (
                                <div
                                  key={score}
                                  className={`flex gap-4 border-2 p-4 ${
                                    isTopLevel
                                      ? 'border-[#D2691E] bg-[#D2691E]/5 dark:border-[#E87D3E] dark:bg-[#E87D3E]/10'
                                      : 'border-[#2B2B2B] dark:border-gray-200'
                                  }`}
                                >
                                  <div className="flex-shrink-0">
                                    <span
                                      className={`inline-block px-2 py-1 font-serif text-lg font-light ${
                                        isTopLevel
                                          ? 'text-[#D2691E] dark:text-[#E87D3E]'
                                          : 'text-[#2B2B2B] dark:text-gray-200'
                                      }`}
                                    >
                                      {score}
                                    </span>
                                    <p className="mt-0.5 text-center text-xs text-gray-600 dark:text-gray-400">
                                      {t(`rubric:levelLabels.${score}`)}
                                    </p>
                                  </div>
                                  <div className="flex-1 pt-1">
                                    {description ? (
                                      <p
                                        className={`text-sm leading-relaxed ${
                                          isTopLevel
                                            ? 'text-gray-700 dark:text-gray-300'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                      >
                                        {description}
                                      </p>
                                    ) : (
                                      <p className="text-sm italic text-gray-400 dark:text-gray-600">
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
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              404
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              找不到此評分標準
            </p>
          </div>
          <Link
            to="/teacher/rubrics"
            className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
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
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            錯誤
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            載入評分標準時發生錯誤，請稍後再試
          </p>
        </div>
        <Link
          to="/teacher/rubrics"
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          返回評分標準列表
        </Link>
      </div>
    </div>
  );
}
