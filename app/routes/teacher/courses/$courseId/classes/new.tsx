import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Users, MapPin } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById } from '@/services/course.server';
import { createClass } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { PeriodSelector } from '@/components/course/PeriodSelector';
import { getPeriodByCode, getWeekdayByCode } from '@/constants/schedule';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;

  const course = await getCourseById(courseId, teacher.id);

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  return { teacher, course };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;
  const formData = await request.formData();

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

    const classData = {
      courseId,
      name: name.trim(),
      schedule,
      capacity: capacityStr ? parseInt(capacityStr, 10) : null,
      assistantId: null, // Future enhancement: add assistant selection
    };

    await createClass(teacher.id, classData);

    return redirect(`/teacher/courses/${courseId}`);
  } catch (error) {
    console.error('Error creating class:', error);
    return { error: '建立時段失敗，請重新嘗試。' };
  }
}

export default function NewClass() {
  const { teacher, course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <div>
      <PageHeader
        title="新增時段"
        subtitle={`為「${course.name}」建立新的時段`}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>時段資訊</CardTitle>
            <CardDescription>設定時段的基本資訊，包括名稱、上課時間和人數限制</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {/* 時段名稱 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  時段名稱 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="例如：101班、週五下午班、Section A"
                />
              </div>

              {/* 上課時間選擇 */}
              <div className="space-y-4">
                <PeriodSelector
                  required={true}
                  weekdayName="weekday"
                  periodName="periodCode"
                  showPreview={true}
                />
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
                  <Link to={`/teacher/courses/${course.id}`}>取消</Link>
                </Button>
                <Button type="submit">建立時段</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}