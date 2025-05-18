import { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate, useLoaderData } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { RubricCriteria } from '@/types/grading';

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
  const rubricId = params.rubricId;
  if (!rubricId) {
    return { error: '評分標準ID不存在' };
  }

  const formData = await request.formData();
  const name = formData.get('name')?.toString();
  const description = formData.get('description')?.toString();
  const criteriasJson = formData.get('criterias')?.toString();

  if (!name || !description || !criteriasJson) {
    return { error: '請填寫所有必填欄位' };
  }

  try {
    const criterias = JSON.parse(criteriasJson);
    const { updateRubric } = await import('@/services/rubric.server');
    const totalWeight = criterias.reduce((sum: number, criteria: RubricCriteria) => sum + criteria.weight, 0);
    const rubric = {
      id: rubricId,
      name,
      description,
      criteria: criterias,
      totalWeight,
    };
    const result = await updateRubric(rubricId, rubric);
    if (!result.success) {
      return { error: result.error || '更新評分標準失敗' };
    }
    return Response.redirect(`/rubrics/${rubricId}`);
  } catch (error) {
    console.error('Error updating rubric:', error);
    return { error: '處理數據時發生錯誤' };
  }
};

export default function EditRubricRoute() {
  const { rubric: initialRubric } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criterias, setCriterias] = useState<RubricCriteria[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRubric) {
      setName(initialRubric.name);
      setDescription(initialRubric.description);
      setCriterias(initialRubric.criteria);
    }
  }, [initialRubric]);

  const addCriteria = () => {
    const newCriteria: RubricCriteria = {
      id: uuidv4(),
      name: '',
      description: '',
      weight: 0,
      levels: [
        { score: 1, description: '不符合要求' },
        { score: 3, description: '部分符合要求' },
        { score: 5, description: '完全符合要求' },
      ],
    };
    setCriterias([...criterias, newCriteria]);
  };

  const removeCriteria = (id: string) => {
    setCriterias(criterias.filter((criteria) => criteria.id !== id));
  };

  const updateCriteria = (id: string, field: keyof RubricCriteria, value: string | number) => {
    setCriterias(
      criterias.map((criteria) => {
        if (criteria.id === id) {
          return { ...criteria, [field]: value };
        }
        return criteria;
      })
    );
  };

  const validateForm = () => {
    if (!name) {
      setError('請輸入評分標準名稱');
      return false;
    }
    if (!description) {
      setError('請輸入評分標準描述');
      return false;
    }
    if (criterias.length === 0) {
      setError('請至少新增一個評分條目');
      return false;
    }

    for (const criteria of criterias) {
      if (!criteria.name) {
        setError(`請輸入評分條目名稱`);
        return false;
      }
      if (!criteria.description) {
        setError(`請輸入評分條目描述`);
        return false;
      }
      if (criteria.weight <= 0) {
        setError(`請設定有效的權重值`);
        return false;
      }
    }

    const totalWeight = criterias.reduce((sum, criteria) => sum + criteria.weight, 0);
    if (totalWeight !== 100) {
      setError(`評分條目權重總和必須等於100，目前為${totalWeight}`);
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (!validateForm()) {
      e.preventDefault(); 
    } else {
      console.log('表單提交中，數據：', {
        name,
        description,
        criterias: JSON.stringify(criterias),
      });
      setError('');
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(`/rubrics/${initialRubric.id}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回詳情
        </Button>
      </div>

      <Form method="post" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>編輯評分標準</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">評分標準名稱</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：流程圖評分"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述這個評分標準的用途和適用場景"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>評分項目</CardTitle>
              <Button type="button" variant="outline" onClick={addCriteria}>
                <Plus className="mr-2 h-4 w-4" /> 新增項目
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criterias.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">尚未新增評分項目，請點擊「新增項目」按鈕</div>
                ) : (
                  criterias.map((criteria, index) => (
                    <div key={criteria.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">項目 {index + 1}</h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCriteria(criteria.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor={`name-${criteria.id}`}>名稱</Label>
                          <Input
                            id={`name-${criteria.id}`}
                            value={criteria.name}
                            onChange={(e) => updateCriteria(criteria.id, 'name', e.target.value)}
                            placeholder="例如：流程圖評分"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`weight-${criteria.id}`}>權重 (%)</Label>
                          <Input
                            id={`weight-${criteria.id}`}
                            type="number"
                            min="1"
                            max="100"
                            value={criteria.weight.toString()}
                            onChange={(e) => updateCriteria(criteria.id, 'weight', parseInt(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`description-${criteria.id}`}>描述</Label>
                        <Textarea
                          id={`description-${criteria.id}`}
                          value={criteria.description}
                          onChange={(e) => updateCriteria(criteria.id, 'description', e.target.value)}
                          placeholder="描述這個評分條目評估的具體內容"
                          className="min-h-[200px]"
                          required
                        />
                      </div>
                    </div>
                  ))
                )}

                <input type="hidden" name="criterias" value={JSON.stringify(criterias)} />
              </div>
            </CardContent>
          </Card>

          {(error || actionData?.error) && <div className="text-red-500 font-medium">{error || actionData?.error}</div>}

          <div className="flex justify-end">
            <Button type="submit" disabled={criterias.length === 0}>
              <Save className="mr-2 h-4 w-4" /> 保存評分標準
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
