import { useState, useEffect } from 'react';
import { Form, useActionData, redirect } from 'react-router';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Eye, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { RubricForm } from '@/components/RubricForm';
import { CategoryNav } from '@/components/CategoryNav';
import { Accordion } from '@/components/ui/accordion';
import { CriterionItemAccordion } from '@/components/CriterionItemAccordion';
import { RubricPreview } from '@/components/RubricPreview';
import { AIRubricAssistant } from '@/components/AIRubricAssistant';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { 
  UICategory,
  UICriterion,
  UIRubricData,
  Level
} from '@/utils/rubric-transform';

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
    
    const { getUserId } = await import('@/services/auth.server');
    const userId = await getUserId(request);
    
    if (!userId) {
      return Response.json({ error: '用戶未登入' });
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
      return Response.json({ error: result.error || '創建評分標準失敗' });
    }

    return redirect('/teacher/rubrics');
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

  const canSave = () => {
    return rubricData.name.trim() && 
           rubricData.description.trim() && 
           rubricData.categories.length > 0;
  };

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
    
    setSelectedCategoryId(newCategory.id);
    setSelectedCriterionId(null);
    
    return newCategory.id; 
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
    
    setSelectedCriterionId(newCriterion.id);
    
    return newCriterion.id;
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
    if (rubricData.categories.length > 0 || rubricData.name || rubricData.description) {
      if (!confirm('套用 AI 生成的評分標準將會覆蓋現有內容，確定要繼續嗎？')) {
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
    <div className="bg-background text-foreground">
      <PageHeader
        title="Create New Rubric"
        subtitle="Build a detailed rubric by defining categories and criteria."
        actions={(
          <>
            <Button type="button" variant="outline" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button type="button" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </>
        )}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Form method="post" id="rubric-form">
          <input type="hidden" name="name" value={rubricData.name} />
          <input type="hidden" name="description" value={rubricData.description} />
          <input type="hidden" name="categoriesJson" value={JSON.stringify(rubricData.categories)} />

        <div className="space-y-6">
          {/* Card 1: Basic Information */}
          <RubricForm
            data={{ name: rubricData.name, description: rubricData.description }}
            onChange={updateRubricForm}
            title="Rubric Details"
          />

          {/* Card 2: Categories */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Categories</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAIAssistant(true)}>
                  <Sparkles className="w-4 h-4 mr-2" /> AI 生成標準
                </Button>
                <Button type="button" onClick={() => addCategory()}>
                  <Plus className="w-4 h-4 mr-2" /> 新增類別
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
          <Card className="bg-card text-card-foreground border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {selectedCategory ? selectedCategory.name : 'Criteria'}
              </CardTitle>
              <Button onClick={() => addCriterion()} disabled={isLoading} type="button">
                <Plus className="w-4 h-4 mr-2" />
                新增標準
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedCategory ? (
                <p className="text-muted-foreground">Select a category to view and add criteria.</p>
              ) : selectedCategory.criteria.length === 0 ? (
                <p className="text-muted-foreground">尚未新增評分標準。點擊「新增標準」以新增第一個標準。</p>
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
