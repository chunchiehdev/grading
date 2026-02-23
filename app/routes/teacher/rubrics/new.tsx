import { useState, useEffect } from 'react';
import { Form, useActionData, redirect, useRouteError, isRouteErrorResponse } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Eye, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { RubricForm } from '@/components/rubrics/RubricForm';
import { CategoryNav } from '@/components/ui/CategoryNav';
import { Accordion } from '@/components/ui/accordion';
import { CriterionItemAccordion } from '@/components/rubrics/CriterionItemAccordion';
import { RubricPreview } from '@/components/rubrics/RubricPreview';
import { AIRubricAssistant } from '@/components/rubrics/AIRubricAssistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { getKemberRubricTemplate } from '@/utils/kember-rubric-template';

import type { UICategory, UICriterion, UIRubricData, Level } from '@/utils/rubric-transform';

const DEFAULT_LEVELS: Level[] = [
  { score: 4, description: '' },
  { score: 3, description: '' },
  { score: 2, description: '' },
  { score: 1, description: '' },
];

const createCriterion = (name = '', description = ''): UICriterion => ({
  id: uuidv4(),
  name,
  description,
  levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
});

const createCategory = (name = ''): UICategory => ({
  id: uuidv4(),
  name,
  criteria: [],
});

export const action = async ({ request }: { request: Request }) => {
  try {
    const formData = await request.formData();

    const { CreateRubricRequestSchema } = await import('@/schemas/rubric');
    const validationResult = CreateRubricRequestSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      categoriesJson: formData.get('categoriesJson'),
    });

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return Response.json({ error: 'Validation failed' });
    }

    const { name, description, categoriesJson } = validationResult.data;

    const { getUserId } = await import('@/services/auth.server');
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: 'User not authenticated' });
    }

    const { createRubric } = await import('@/services/rubric.server');

    const rubricData = {
      name,
      description,
      categories: categoriesJson,
    };

    const result = await createRubric(rubricData, userId);

    if (!result.success) {
      console.error('Create rubric failed:', result.error);
      return Response.json({ error: result.error || 'Failed to create rubric' });
    }

    return redirect('/teacher/rubrics');
  } catch (error) {
    console.error('Action error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Error processing request',
    });
  }
};

// Main Component
export default function NewRubricRoute() {
  const { t } = useTranslation(['rubric', 'common']);
  const actionData = useActionData<{ error?: string }>();

  const [rubricData, setRubricData] = useState<UIRubricData>({
    name: '',
    description: '',
    categories: [],
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Computed values
  const selectedCategory = rubricData.categories.find((c) => c.id === selectedCategoryId);
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);

  const canSave = () => {
    return rubricData.name.trim() && rubricData.description.trim() && rubricData.categories.length > 0;
  };

  const updateRubricForm = (formData: { name: string; description: string }) => {
    setRubricData((prev) => ({ ...prev, ...formData }));
  };

  const addCategory = (name?: string): string => {
    const categoryName = name || t('rubric:newCategory', { number: rubricData.categories.length + 1 });
    const newCategory = createCategory(categoryName);

    setRubricData((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));

    setSelectedCategoryId(newCategory.id);
    setSelectedCriterionId(null);

    return newCategory.id;
  };

  const updateCategory = (categoryId: string, name: string) => {
    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => (cat.id === categoryId ? { ...cat, name } : cat)),
    }));
  };

  const deleteCategory = (categoryId: string) => {
    const category = rubricData.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const message =
      category.criteria.length > 0
        ? t('rubric:confirmDeleteCategoryWithCriteria', {
            categoryName: category.name,
            count: category.criteria.length,
          })
        : t('rubric:confirmDeleteCategory', { categoryName: category.name });

    if (!confirm(message)) return;

    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
    }));

    if (selectedCategoryId === categoryId) {
      const remainingCategories = rubricData.categories.filter((c) => c.id !== categoryId);
      setSelectedCategoryId(remainingCategories.length > 0 ? remainingCategories[0].id : null);
      setSelectedCriterionId(null);
    }
  };

  const addCriterion = (name?: string): string => {
    if (!selectedCategoryId) {
      console.warn('No category selected for adding criterion');
      return '';
    }

    const criterionName = name || t('rubric:newCriterion', { number: (selectedCategory?.criteria.length || 0) + 1 });
    const newCriterion = createCriterion(criterionName);

    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === selectedCategoryId ? { ...category, criteria: [...category.criteria, newCriterion] } : category
      ),
    }));

    setSelectedCriterionId(newCriterion.id);

    return newCriterion.id;
  };

  const updateCriterion = (criterionId: string, updates: Partial<UICriterion>) => {
    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === selectedCategoryId
          ? {
              ...category,
              criteria: category.criteria.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, ...updates } : criterion
              ),
            }
          : category
      ),
    }));
  };

  const deleteCriterion = (criterionId: string) => {
    const criterion = selectedCategory?.criteria.find((c) => c.id === criterionId);
    if (!criterion) return;

    if (!confirm(t('rubric:confirmDeleteCriterion', { criterionName: criterion.name }))) return;

    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === selectedCategoryId
          ? { ...category, criteria: category.criteria.filter((c) => c.id !== criterionId) }
          : category
      ),
    }));

    if (selectedCriterionId === criterionId) {
      setSelectedCriterionId(null);
    }
  };

  const updateLevel = (criterionId: string, score: number, description: string) => {
    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === selectedCategoryId
          ? {
              ...category,
              criteria: category.criteria.map((criterion) =>
                criterion.id === criterionId
                  ? {
                      ...criterion,
                      levels: criterion.levels.some((l) => l.score === score)
                        ? criterion.levels.map((l) => (l.score === score ? { ...l, description } : l))
                        : [...criterion.levels, { score, description }],
                    }
                  : criterion
              ),
            }
          : category
      ),
    }));
  };

  const handleSave = async () => {
    if (!canSave()) {
      alert(t('rubric:validation.completeRequired'));
      return;
    }

    setIsLoading(true);
    const form = document.getElementById('rubric-form') as HTMLFormElement;
    form?.requestSubmit();
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleApplyAIRubric = (aiRubric: UIRubricData) => {
    if (rubricData.categories.length > 0 || rubricData.name || rubricData.description) {
      if (!confirm(t('rubric:aiAssistant.confirmOverwrite'))) {
        return;
      }
    }

    setRubricData(aiRubric);

    if (aiRubric.categories.length > 0) {
      setSelectedCategoryId(aiRubric.categories[0].id);
      if (aiRubric.categories[0].criteria.length > 0) {
        setSelectedCriterionId(aiRubric.categories[0].criteria[0].id);
      }
    }

    setShowAIAssistant(false);
  };

  const handleApplyKemberTemplate = () => {
    if (rubricData.categories.length > 0 || rubricData.name || rubricData.description) {
      if (!confirm('這樣會覆蓋您目前編輯的內容，確定要套用 Kember 範本嗎？')) {
        return;
      }
    }

    const kemberRubric = getKemberRubricTemplate();
    setRubricData(kemberRubric);

    if (kemberRubric.categories.length > 0) {
      setSelectedCategoryId(kemberRubric.categories[0].id);
      if (kemberRubric.categories[0].criteria.length > 0) {
        setSelectedCriterionId(kemberRubric.categories[0].criteria[0].id);
      }
    }
  };

  // Draft recovery on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem('rubric-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Check if user wants to restore
        const shouldRestore = window.confirm(
          t('rubric:draftRecovery.message', {
            defaultValue: 'Unsaved draft found. Would you like to restore it?',
          })
        );

        if (shouldRestore) {
          setRubricData(draft);
          if (draft.categories.length > 0) {
            setSelectedCategoryId(draft.categories[0].id);
            if (draft.categories[0].criteria.length > 0) {
              setSelectedCriterionId(draft.categories[0].criteria[0].id);
            }
          }
        } else {
          localStorage.removeItem('rubric-draft');
        }
      } catch (error) {
        console.error('Error recovering draft:', error);
        localStorage.removeItem('rubric-draft');
      }
    }
  }, []);

  // Auto-save draft to localStorage with debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only save if there's content
    if (!rubricData.name && rubricData.categories.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('rubric-draft', JSON.stringify(rubricData));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [rubricData]);

  // Clear draft on successful submission
  useEffect(() => {
    if (actionData && !actionData.error) {
      try {
        localStorage.removeItem('rubric-draft');
      } catch (error) {
        console.error('Error clearing draft:', error);
      }
    }
  }, [actionData]);

  // Handle clear draft
  const handleClearDraft = () => {
    if (window.confirm(t('rubric:draftRecovery.clearConfirm', { defaultValue: 'Clear draft?' }))) {
      localStorage.removeItem('rubric-draft');
      setRubricData({ name: '', description: '', categories: [] });
      setSelectedCategoryId(null);
      setSelectedCriterionId(null);
    }
  };

  useEffect(() => {
    if (actionData) {
      setIsLoading(false);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen bg-background">
      {/* 標題區 - 居中 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-12 pb-4 sm:pb-6 lg:pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            {t('rubric:header.newRubricTitle')}
          </h1>
        </div>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4">
          您可以手動建立評分標準，或是直接點擊下方套用專業範本。
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleApplyKemberTemplate}
            className="rounded-full shadow-sm hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            套用 Kember (2008) 批判性反思範本
          </Button>
        </div>
        {/* Clear draft button */}
        {(rubricData.name || rubricData.categories.length > 0) && (
          <Button
            type="button"
            variant="minimal"
            size="sm"
            onClick={handleClearDraft}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            {t('rubric:draftRecovery.clearButton', { defaultValue: 'Clear draft' })}
          </Button>
        )}
      </div>

      <main className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
        <Form method="post" id="rubric-form" className="space-y-6 lg:space-y-8 xl:space-y-10">
          <input type="hidden" name="name" value={rubricData.name} />
          <input type="hidden" name="description" value={rubricData.description} />
          <input type="hidden" name="categoriesJson" value={JSON.stringify(rubricData.categories)} />

          {/* Card 1: Basic Information */}
          <RubricForm
            data={{ name: rubricData.name, description: rubricData.description }}
            onChange={updateRubricForm}
            title={t('rubric:form.basicInfo')}
          />

          {/* Card 2: Categories */}
          <Card className="bg-card text-card-foreground border rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">{t('rubric:categories')}</CardTitle>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAIAssistant(true)}
                  className="h-9 sm:h-10 rounded-xl"
                  size="icon"
                  title={t('rubric:aiAssistant.generateStandards')}
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="sr-only">{t('rubric:aiAssistant.generateStandards')}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => addCategory()}
                  className="h-9 sm:h-10 rounded-xl"
                  size="icon"
                  title={t('rubric:addCategory')}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="sr-only">{t('rubric:addCategory')}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CategoryNav
                categories={rubricData.categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
              />
            </CardContent>
          </Card>

          {/* Card 3: Criteria */}
          <Card className="bg-card text-card-foreground border rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold truncate min-w-0 flex-1">
                {selectedCategory ? selectedCategory.name : t('rubric:criteria')}
              </CardTitle>
              {selectedCategory && (
                <Button
                  onClick={() => addCriterion()}
                  disabled={isLoading}
                  type="button"
                  className="h-9 sm:h-10 rounded-xl flex-shrink-0"
                  size="icon"
                  title={t('rubric:addCriterion')}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="sr-only">{t('rubric:addCriterion')}</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {!selectedCategory ? (
                <p className="text-base lg:text-lg text-muted-foreground">{t('rubric:emptyState.selectCategory')}</p>
              ) : selectedCategory.criteria.length === 0 ? (
                <p className="text-base lg:text-lg text-muted-foreground">{t('rubric:emptyState.noCriteria')}</p>
              ) : (
                <Accordion type="single" collapsible>
                  {selectedCategory.criteria.map((criterion) => (
                    <CriterionItemAccordion
                      key={criterion.id}
                      criterion={criterion}
                      isSelected={selectedCriterionId === criterion.id}
                      onSelect={() => setSelectedCriterionId(criterion.id)}
                      onUpdate={(updates) => updateCriterion(criterion.id, updates)}
                      onDelete={() => deleteCriterion(criterion.id)}
                      onUpdateLevel={(score, description) => updateLevel(criterion.id, score, description)}
                    />
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              className="flex-1 h-11 sm:h-12 rounded-xl text-sm sm:text-base font-medium"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('common:preview')}
            </Button>
            <Button
              type="button"
              variant="emphasis"
              onClick={handleSave}
              disabled={!canSave() || isLoading}
              className="flex-1 h-11 sm:h-12 rounded-xl text-sm sm:text-base font-medium"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {isLoading ? t('rubric:saving') : t('common:save')}
            </Button>
          </div>
        </Form>
      </main>

      {/* AI Assistant Modal */}
      <AIRubricAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onApplyRubric={handleApplyAIRubric}
        currentRubric={rubricData}
      />

      {/* Preview Modal */}
      <RubricPreview isOpen={showPreview} onClose={() => setShowPreview(false)} rubricData={rubricData} />

      {/* Error Toast */}
      {actionData?.error && (
        <div
          className="fixed right-4 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-md"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="font-medium">{t('rubric:messages.saveError')}</div>
          <div className="text-sm opacity-90 mt-1">{actionData.error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>{t('rubric:saving')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <ErrorPage
        statusCode={401}
        messageKey="errors.401.message"
        returnTo="/teacher/rubrics"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.rubric"
      returnTo="/teacher/rubrics"
    />
  );
}
