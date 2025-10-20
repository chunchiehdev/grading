import { useState, useEffect } from 'react';
import { Form, useActionData, redirect } from 'react-router';
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

  useEffect(() => {
    if (actionData) {
      setIsLoading(false);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen bg-background">
      {/* 標題區 - 居中 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {t('rubric:header.newRubricTitle')}
        </h1>
        <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">{t('rubric:newRubricSubtitle')}</p>
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
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 lg:p-8 xl:p-10">
              <CardTitle className="text-lg lg:text-xl xl:text-2xl font-semibold">{t('rubric:categories')}</CardTitle>
              <div className="flex items-center gap-2 lg:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAIAssistant(true)}
                  className="h-10 sm:h-11 lg:h-12 rounded-xl text-sm lg:text-base"
                >
                  <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> {t('rubric:aiAssistant.generateStandards')}
                </Button>
                <Button
                  type="button"
                  onClick={() => addCategory()}
                  className="h-10 sm:h-11 lg:h-12 rounded-xl text-sm lg:text-base"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> {t('rubric:addCategory')}
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
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 lg:p-8 xl:p-10">
              <CardTitle className="text-lg lg:text-xl xl:text-2xl font-semibold">
                {selectedCategory ? selectedCategory.name : t('rubric:criteria')}
              </CardTitle>
              <Button
                onClick={() => addCriterion()}
                disabled={isLoading}
                type="button"
                className="h-10 sm:h-11 lg:h-12 rounded-xl text-sm lg:text-base"
              >
                <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                {t('rubric:addCriterion')}
              </Button>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 lg:p-8 xl:p-10 pt-0">
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
            >
              <Eye className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
              {t('common:preview')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave() || isLoading}
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Save className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
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
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
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
