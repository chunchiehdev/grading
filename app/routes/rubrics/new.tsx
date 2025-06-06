import { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate, redirect } from 'react-router';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Components
import { RubricHeader } from '@/components/RubricHeader';
import { RubricForm } from '@/components/RubricForm';
import { CategoryNav } from '@/components/CategoryNav';
import { CriterionCard } from '@/components/CriterionCard';
import { QuickAdd } from '@/components/QuickAdd';
import { GuidedEmptyState } from '@/components/GuidedEmptyState';
import { RubricPreview } from '@/components/RubricPreview';
import { AIRubricAssistant } from '@/components/AIRubricAssistant';

// Types and Utils
import type { 
  UICategory,
  UICriterion,
  UIRubricData,
  Level
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
  levels: DEFAULT_LEVELS.map(l => ({ ...l })),
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
      return Response.json({ error: '資料驗證失敗' });
    }

    const { name, description, categoriesJson } = validationResult.data;
    
    // Get user ID from session
    const { getUserId } = await import('@/services/auth.server');
    const userId = await getUserId(request);
    
    if (!userId) {
      return Response.json({ error: '用戶未登入' });
    }
    
    const { createRubric } = await import('@/services/rubric.server');

    const rubricData = {
      name,
      description,
      categories: categoriesJson, // schema 已經處理過轉換
    };
    
    const result = await createRubric(rubricData, userId);
    if (!result.success) {
      console.error('Create rubric failed:', result.error);
      return Response.json({ error: result.error || '創建評分標準失敗' });
    }

    console.log('Rubric created successfully:', result.rubricId);
    return redirect('/rubrics');
  } catch (error) {
    console.error('Action error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : '處理請求時發生錯誤'
    });
  }
};

// Main Component
export default function NewRubricRoute() {
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
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Computed values
  const selectedCategory = rubricData.categories.find(c => c.id === selectedCategoryId);
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
  const completedCriteria = rubricData.categories.reduce((acc, cat) => 
    acc + cat.criteria.filter(crit => 
      crit.levels.some(level => level.description.trim())
    ).length, 0
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
    return rubricData.name.trim() && 
           rubricData.description.trim() && 
           rubricData.categories.length > 0; // 只要有類別就可以儲存，不強制要求標準
  };

  // Handlers
  const updateRubricForm = (formData: { name: string; description: string }) => {
    setRubricData(prev => ({ ...prev, ...formData }));
  };

  const addCategory = (name?: string): string => {
    const categoryName = name || `類別 ${rubricData.categories.length + 1}`;
    const newCategory = createCategory(categoryName);
    
    setRubricData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
    
    // 自動選擇新創建的類別
    setSelectedCategoryId(newCategory.id);
    setSelectedCriterionId(null);
    
    return newCategory.id; // 返回新類別的 ID，供後續使用
  };

  const updateCategory = (categoryId: string, name: string) => {
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, name } : cat
      ),
    }));
  };

  const deleteCategory = (categoryId: string) => {
    const category = rubricData.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const message = category.criteria.length > 0 
      ? `確定要刪除「${category.name}」類別嗎？這將同時刪除其下的 ${category.criteria.length} 個評分標準。`
      : `確定要刪除「${category.name}」類別嗎？`;
      
    if (!confirm(message)) return;
    
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId),
    }));
    
    // 如果刪除的是當前選中的類別，重置選擇
    if (selectedCategoryId === categoryId) {
      const remainingCategories = rubricData.categories.filter(c => c.id !== categoryId);
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
    
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === selectedCategoryId
          ? { ...category, criteria: [...category.criteria, newCriterion] }
          : category
      ),
    }));
    
    // 自動選擇新創建的標準
    setSelectedCriterionId(newCriterion.id);
    
    return newCriterion.id; // 返回新標準的 ID
  };

  const updateCriterion = (criterionId: string, updates: Partial<UICriterion>) => {
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === selectedCategoryId
          ? {
              ...category,
              criteria: category.criteria.map(criterion =>
                criterion.id === criterionId
                  ? { ...criterion, ...updates }
                  : criterion
              ),
            }
          : category
      ),
    }));
  };

  const deleteCriterion = (criterionId: string) => {
    const criterion = selectedCategory?.criteria.find(c => c.id === criterionId);
    if (!criterion) return;
    
    if (!confirm(`確定要刪除「${criterion.name}」評分標準嗎？`)) return;
    
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === selectedCategoryId
          ? { ...category, criteria: category.criteria.filter(c => c.id !== criterionId) }
          : category
      ),
    }));
    
    if (selectedCriterionId === criterionId) {
      setSelectedCriterionId(null);
    }
  };

  const updateLevel = (criterionId: string, score: number, description: string) => {
    setRubricData(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === selectedCategoryId
          ? {
              ...category,
              criteria: category.criteria.map(criterion =>
                criterion.id === criterionId
                  ? {
                      ...criterion,
                      levels: criterion.levels.some(l => l.score === score)
                        ? criterion.levels.map(l => l.score === score ? { ...l, description } : l)
                        : [...criterion.levels, { score, description }]
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

  const handleApplyAIRubric = (aiRubric: UIRubricData) => {
    // 確認是否要覆蓋現有內容
    if (rubricData.categories.length > 0 || rubricData.name || rubricData.description) {
      if (!confirm('套用 AI 生成的評分標準將會覆蓋現有內容，確定要繼續嗎？')) {
        return;
      }
    }
    
    // 套用 AI 生成的評分標準
    setRubricData(aiRubric);
    
    // 自動選擇第一個類別
    if (aiRubric.categories.length > 0) {
      setSelectedCategoryId(aiRubric.categories[0].id);
      if (aiRubric.categories[0].criteria.length > 0) {
        setSelectedCriterionId(aiRubric.categories[0].criteria[0].id);
      }
    }
    
    // 關閉 AI 助手面板
    setShowAIAssistant(false);
  };

  // Reset loading state when action completes
  useEffect(() => {
    if (actionData) {
      setIsLoading(false);
    }
  }, [actionData]);

  // Auto-save functionality (Optional)
  // useEffect(() => {
  //   const autoSave = setTimeout(() => {
  //     if (rubricData.name || rubricData.description || rubricData.categories.length > 0) {
  //       localStorage.setItem('rubric-draft', JSON.stringify(rubricData));
  //     }
  //   }, 5000);
  //   return () => clearTimeout(autoSave);
  // }, [rubricData]);

  return (
    <div className="min-h-screen bg-background">
      <RubricHeader
        onBack={() => navigate(-1)}
        onSave={handleSave}
        onPreview={handlePreview}
        progress={progress}
        rubricName={rubricData.name}
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
              
              {/* AI 助手按鈕 */}
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowAIAssistant(true)}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 生成標準
                </Button>
              </div>
              
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
                          <span className="ml-2">
                            • 最高 {selectedCategory.criteria.length * 4} 分
                          </span>
                        )}
                      </p>
                    </div>
                    <Button onClick={() => addCriterion()} disabled={isLoading} type="button">
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
                      {selectedCategory.criteria.length > 0 && completedCriteria < totalCriteria && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-amber-800">完善您的評分標準</h4>
                              <p className="text-sm text-amber-700 mt-1">
                                還有 {totalCriteria - completedCriteria} 個標準需要添加等級描述。
                                完整的描述將有助於確保評分的一致性。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedCategory.criteria.map((criterion) => (
                        <CriterionCard
                          key={criterion.id}
                          criterion={criterion}
                          isSelected={selectedCriterionId === criterion.id}
                          onSelect={() => setSelectedCriterionId(criterion.id)}
                          onUpdate={(updates) => updateCriterion(criterion.id, updates)}
                          onDelete={() => deleteCriterion(criterion.id)}
                          onUpdateLevel={(score, description) => 
                            updateLevel(criterion.id, score, description)
                          }
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

      {/* AI Assistant Modal */}
      <AIRubricAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onApplyRubric={handleApplyAIRubric}
        currentRubric={rubricData}
      />

      {/* Preview Modal */}
      <RubricPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        rubricData={rubricData}
      />

      {/* Error Toast */}
      {actionData?.error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="font-medium">儲存失敗</div>
          <div className="text-sm opacity-90 mt-1">{actionData.error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>正在儲存評分標準...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 