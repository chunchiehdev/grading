import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Clock, Users, MapPin } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById } from '@/services/course.server';
import { createClass } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const day = formData.get('day') as string;
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  const room = formData.get('room') as string;
  const capacityStr = formData.get('capacity') as string;

  if (!name || name.trim().length === 0) {
    return { error: '班次名稱為必填項目' };
  }

  try {
    // Build schedule object (only if at least day is provided)
    let schedule = null;
    if (day) {
      schedule = {
        day,
        startTime: startTime || '',
        endTime: endTime || '',
        room: room || '',
      };
    }

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
    return { error: '建立班次失敗，請重新嘗試。' };
  }
}

export default function NewClass() {
  const { teacher, course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <div>
      <PageHeader
        title="新增班次"
        subtitle={`為「${course.name}」建立新的班次`}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>班次資訊</CardTitle>
            <CardDescription>設定班次的基本資訊，包括名稱、上課時間和人數限制</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {/* 班次名稱 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  班次名稱 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="例如：101班、週五下午班、Section A"
                />
              </div>

              {/* 上課時間區塊 */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  上課時間（選填）
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 星期 */}
                  <div className="space-y-2">
                    <Label htmlFor="day">星期</Label>
                    <Select name="day">
                      <SelectTrigger id="day">
                        <SelectValue placeholder="選擇星期" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="星期一">星期一</SelectItem>
                        <SelectItem value="星期二">星期二</SelectItem>
                        <SelectItem value="星期三">星期三</SelectItem>
                        <SelectItem value="星期四">星期四</SelectItem>
                        <SelectItem value="星期五">星期五</SelectItem>
                        <SelectItem value="星期六">星期六</SelectItem>
                        <SelectItem value="星期日">星期日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 開始時間 */}
                  <div className="space-y-2">
                    <Label htmlFor="startTime">開始時間</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      placeholder="14:00"
                    />
                  </div>

                  {/* 結束時間 */}
                  <div className="space-y-2">
                    <Label htmlFor="endTime">結束時間</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      placeholder="17:00"
                    />
                  </div>
                </div>

                {/* 教室 */}
                <div className="space-y-2">
                  <Label htmlFor="room" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    教室
                  </Label>
                  <Input
                    id="room"
                    name="room"
                    placeholder="例如：資訊館 301"
                  />
                </div>
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
                  設定班次的最大學生人數，留空表示無限制
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
                <Button type="submit">建立班次</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}