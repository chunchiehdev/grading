import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Users, MapPin, Save, Trash2 } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getClassById, updateClass, deleteClass } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { PeriodSelector, type PeriodSelectorValue } from '@/components/course/PeriodSelector';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  courseId: string;
  class: {
    id: string;
    name: string;
    schedule: any | null;
    capacity: number | null;
    course: {
      id: string;
      name: string;
    };
  };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, classId } = params;

  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  const classData = await getClassById(classId, teacher.id);

  if (!classData) {
    throw new Response('Class not found', { status: 404 });
  }

  return {
    teacher,
    courseId,
    class: classData,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const { courseId, classId } = params;

  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'update';

  // Handle delete action
  if (intent === 'delete') {
    try {
      const success = await deleteClass(classId, teacher.id);
      if (!success) {
        return { error: '刪除時段失敗' };
      }
      return redirect(`/teacher/courses/${courseId}`);
    } catch (error: any) {
      console.error('Error deleting class:', error);
      return { error: error.message || '刪除時段時發生錯誤' };
    }
  }

  // Handle update action
  if (intent === 'update') {
    const name = formData.get('name') as string;
    const weekday = formData.get('weekday') as string;
    const periodCode = formData.get('periodCode') as string;
    const room = formData.get('room') as string;
    const capacityStr = formData.get('capacity') as string;

    if (!name || name.trim().length === 0) {
      return { error: '時段名稱為必填項目' };
    }

    if (!weekday || !periodCode) {
      return { error: '請選擇上課時間（星期和節次）' };
    }

    try {
      // Build schedule object with new format
      const schedule = {
        weekday,
        periodCode,
        room: room || '',
      };

      const updateData = {
        name: name.trim(),
        schedule,
        capacity: capacityStr ? parseInt(capacityStr, 10) : null,
      };

      await updateClass(classId, teacher.id, updateData);

      return redirect(`/teacher/courses/${courseId}`);
    } catch (error) {
      console.error('Error updating class:', error);
      return { error: '更新時段失敗，請重新嘗試。' };
    }
  }

  return { error: 'Invalid intent' };
}

export default function EditClass() {
  const { courseId, class: classData } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  // 提取現有的時段資料（支援新舊格式）
  const initialPeriodValue: PeriodSelectorValue | undefined = classData.schedule?.weekday && classData.schedule?.periodCode
    ? { weekday: classData.schedule.weekday, periodCode: classData.schedule.periodCode }
    : undefined;

  return (
    <div>
      <PageHeader
        title="編輯時段"
        subtitle={`${classData.course.name} - ${classData.name}`}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>時段資訊</CardTitle>
              <CardDescription>修改時段的名稱、上課時間和人數限制</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update" />

                {/* 時段名稱 */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    時段名稱 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={classData.name}
                    placeholder="例如：101班、週五下午班、Section A"
                  />
                </div>

                {/* 上課時間選擇 */}
                <div className="space-y-4">
                  <PeriodSelector
                    value={initialPeriodValue}
                    required={true}
                    weekdayName="weekday"
                    periodName="periodCode"
                    showPreview={true}
                  />

                  {/* 舊格式資料提示 */}
                  {classData.schedule && !classData.schedule.periodCode && classData.schedule.day && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        此時段使用舊格式儲存。請重新選擇星期和節次以更新為新格式。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* 教室 */}
                <div className="space-y-2">
                  <Label htmlFor="room" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    教室（選填）
                  </Label>
                  <Input
                    id="room"
                    name="room"
                    defaultValue={classData.schedule?.room || ''}
                    placeholder="例如：資訊館 301"
                  />
                </div>

                {/* 人數上限 */}
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    人數上限（選填）
                  </Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    defaultValue={classData.capacity || ''}
                    placeholder="不填寫則無人數限制"
                  />
                  <p className="text-sm text-muted-foreground">
                    設定時段的最大學生人數，留空表示無限制
                  </p>
                </div>

                {actionData?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{actionData.error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-4">
                  <Button asChild variant="outline">
                    <Link to={`/teacher/courses/${courseId}`}>取消</Link>
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    儲存變更
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Danger Zone Card */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">危險區域</CardTitle>
              <CardDescription>
                刪除時段後無法復原，該時段的所有學生註冊資料將被移除
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  注意：刪除時段將移除所有已註冊學生的資料，此操作無法復原
                </AlertDescription>
              </Alert>
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <Button
                  type="submit"
                  variant="destructive"
                  onClick={(e) => {
                    if (!confirm('確定要刪除此時段嗎？此操作無法復原，將刪除所有學生註冊資料。')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  刪除時段
                </Button>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
