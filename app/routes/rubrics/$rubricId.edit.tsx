import { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate, useLoaderData, redirect } from 'react-router';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Components
import { RubricHeader } from '@/components/RubricHeader';
import { RubricForm } from '@/components/RubricForm';
import { CategoryNav } from '@/components/CategoryNav';
import { CriterionCard } from '@/components/CriterionCard';
// import { QuickAdd } from '@/components/QuickAdd';
import { GuidedEmptyState } from '@/components/GuidedEmptyState';
import { RubricPreview } from '@/components/RubricPreview';

// Utils
import {
  dbCriteriaToUICategories,
  type UICategory,
  type UICriterion,
  type UIRubricData,
  type Level,
} from '@/utils/rubric-transform';

// Utilities
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

export const action = async ({ request, params }: { request: Request; params: Record<string, string | undefined> }) => {
  try {
    const rubricId = params.rubricId;
    if (!rubricId) {
      return Response.json({ error: '評分標準ID不存在' });
    }

    const formData = await request.formData();

    // 使用 Zod 驗證表單資料
    const { UpdateRubricRequestSchema } = await import('@/schemas/rubric');
    const validationResult = UpdateRubricRequestSchema.safeParse({
      id: rubricId,
      name: formData.get('name')?.toString(),
      description: formData.get('description')?.toString(),
      categoriesJson: formData.get('categoriesJson')?.toString(),
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      console.error('Validation failed:', validationResult.error.errors);
      return Response.json({
        error: firstError.message || '表單資料驗證失敗',
        field: firstError.path[0], // 提供錯誤欄位資訊
      });
    }

    const { id, name, description, categoriesJson } = validationResult.data;

    const { updateRubric } = await import('@/services/rubric.server');

    const rubricData = {
      name,
      description,
      categories: categoriesJson, // schema 已經處理過轉換
    };

    const result = await updateRubric(id, rubricData);
    if (!result.success) {
      console.error('Update rubric failed:', result.error);
      return Response.json({ error: result.error || '更新評分標準失敗' });
    }

    console.log('Rubric updated successfully:', id);
    return redirect(`/rubrics/${id}`);
  } catch (error) {
    console.error('Action error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : '處理請求時發生錯誤',
    });
  }
};

export default function EditRubricRoute() {
  const { rubric: initialRubric } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const navigate = useNavigate();

  // State
  const [rubricData, setRubricData] = useState<UIRubricData>({
    name: '',
    description: '',
    categories: [],
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from loaded rubric
  useEffect(() => {
    if (initialRubric) {
      // 優先使用新的 categories 欄位，否則從 criteria 轉換
      const categories = initialRubric.categories
        ? initialRubric.categories
        : dbCriteriaToUICategories(initialRubric.criteria);

      setRubricData({
        name: initialRubric.name,
        description: initialRubric.description,
        categories,
      });

      // 預設選擇第一個類別
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    }
  }, [initialRubric]);

  // Reset loading state when action completes
  useEffect(() => {
    if (actionData) {
      setIsLoading(false);
    }
  }, [actionData]);

  // Computed values
  const selectedCategory = rubricData.categories.find((c) => c.id === selectedCategoryId);
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
  const completedCriteria = rubricData.categories.reduce(
    (acc, cat) => acc + cat.criteria.filter((crit) => crit.levels.some((level) => level.description.trim())).length,
    0
  );

  const progress = {
    categories: rubricData.categories.length,
    criteria: totalCriteria,
    completed: completedCriteria,
  };

  // 判斷當前步驟
  const getCurrentStep = (): number => {
    if (rubricData.categories.length === 0) return 1;
    if (totalCriteria === 0) return 2;
    return 3;
  };

  // Validation
  const canSave = () => {
    return rubricData.name.trim() && rubricData.description.trim() && rubricData.categories.length > 0; // 只要有類別就可以儲存，不強制要求標準
  };

  // Handlers
  const updateRubricForm = (formData: { name: string; description: string }) => {
    setRubricData((prev) => ({ ...prev, ...formData }));
  };

  const addCategory = (name?: string): string => {
    const categoryName = name || `類別 ${rubricData.categories.length + 1}`;
    const newCategory = createCategory(categoryName);

    setRubricData((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));

    // 自動選擇新創建的類別
    setSelectedCategoryId(newCategory.id);
    setSelectedCriterionId(null);

    return newCategory.id; // 返回新類別的 ID
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
        ? `確定要刪除「${category.name}」類別嗎？這將同時刪除其下的 ${category.criteria.length} 個評分標準。`
        : `確定要刪除「${category.name}」類別嗎？`;

    if (!confirm(message)) return;

    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
    }));

    // 智能選擇下一個類別
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

    const criterionName = name || `標準 ${(selectedCategory?.criteria.length || 0) + 1}`;
    const newCriterion = createCriterion(criterionName);

    setRubricData((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === selectedCategoryId ? { ...category, criteria: [...category.criteria, newCriterion] } : category
      ),
    }));

    // 自動選擇新創建的標準
    setSelectedCriterionId(newCriterion.id);

    return newCriterion.id; // 返回新標準的 ID
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

    if (!confirm(`確定要刪除「${criterion.name}」評分標準嗎？`)) return;

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
      alert('請完成所有必填項目再儲存');
      return;
    }

    setIsLoading(true);
    const form = document.getElementById('rubric-form') as HTMLFormElement;
    form?.requestSubmit();
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <RubricHeader
        onBack={() => navigate(`/rubrics/${initialRubric.id}`)}
        onSave={handleSave}
        onPreview={handlePreview}
        progress={progress}
        rubricName={rubricData.name}
        isEditing={true}
      />

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Form method="post" id="rubric-form">
          <input type="hidden" name="name" value={rubricData.name} />
          <input type="hidden" name="description" value={rubricData.description} />
          <input type="hidden" name="categoriesJson" value={JSON.stringify(rubricData.categories)} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Sidebar - Form & Navigation */}
            <div className="xl:col-span-3 space-y-6">
              <RubricForm
                data={{ name: rubricData.name, description: rubricData.description }}
                onChange={updateRubricForm}
              />

              <CategoryNav
                categories={rubricData.categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onAddCategory={() => addCategory()}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
              />

              {/* <QuickAdd
                onAddCategory={addCategory}
                onAddCriterion={addCriterion}
                canAddCriterion={!!selectedCategoryId}
                selectedCategoryName={selectedCategory?.name}
              /> */}
            </div>

            {/* Main Content - Criteria */}
            <div className="xl:col-span-9">
              {selectedCategory ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                      <p className="text-muted-foreground mt-1">
                        {selectedCategory.criteria.length} 個評分標準
                        {selectedCategory.criteria.length > 0 && (
                          <span className="ml-2">• 最高 {selectedCategory.criteria.length * 4} 分</span>
                        )}
                      </p>
                    </div>
                    <Button onClick={() => addCriterion()} disabled={isLoading}>
                      <Plus className="w-4 h-4 mr-2" />
                      新增標準
                    </Button>
                  </div>

                  {/* Criteria Grid */}
                  {selectedCategory.criteria.length === 0 ? (
                    <GuidedEmptyState
                      type="criteria"
                      onAction={() => addCriterion()}
                      currentStep={getCurrentStep()}
                      totalSteps={3}
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Enhancement tip */}
                      {selectedCategory.criteria.map((criterion) => (
                        <CriterionCard
                          key={criterion.id}
                          criterion={criterion}
                          isSelected={selectedCriterionId === criterion.id}
                          onSelect={() => setSelectedCriterionId(criterion.id)}
                          onUpdate={(updates) => updateCriterion(criterion.id, updates)}
                          onDelete={() => deleteCriterion(criterion.id)}
                          onUpdateLevel={(score, description) => updateLevel(criterion.id, score, description)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <GuidedEmptyState
                  type="categories"
                  onAction={() => addCategory()}
                  currentStep={getCurrentStep()}
                  totalSteps={3}
                />
              )}
            </div>
          </div>
        </Form>
      </div>

      {/* Preview Modal */}
      <RubricPreview isOpen={showPreview} onClose={() => setShowPreview(false)} rubricData={rubricData} />

      {/* Error Toast */}
      {actionData?.error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="font-medium">更新失敗</div>
          <div className="text-sm opacity-90 mt-1">{actionData.error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>正在更新評分標準...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
