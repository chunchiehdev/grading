import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Await } from 'react-router';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { createCourse, type CreateCourseData } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface LoaderData {
  teacher: Promise<{ id: string; email: string; role: string }>;
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacherPromise = new Promise<{ id: string; email: string; role: string }>(async (resolve) => {
    await new Promise((res) => setTimeout(res, 2000));
    const teacher = await requireTeacher(request);
    resolve(teacher);
  });

  return { teacher: teacherPromise };
}

export async function action({ request }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const formData = await request.formData();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name || name.trim().length === 0) {
    throw new Response(JSON.stringify({ error: '課程名稱為必填項目' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const courseData: CreateCourseData = {
      name: name.trim(),
      description: description?.trim() || undefined,
    };

    const course = await createCourse(teacher.id, courseData);

    // Redirect to the newly created course
    return redirect(`/teacher/courses/${course.id}`);
  } catch (error) {
    console.error('Error creating course:', error);
    throw new Response(JSON.stringify({ error: '建立課程失敗，請重新嘗試。' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default function NewCourse() {
  const { teacher } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const PageSkeleton = () => (
    <div>
      {/* PageHeader Skeleton - 完全模擬 PageHeader 組件的結構 */}
      <header className="bg-background py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-9 w-24" />
              <div className="mt-3 px-1">
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton - */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          {' '}
          
          
          <div className="flex flex-col space-y-1.5 p-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-80" />
          </div>
          
          <div className="p-6 pt-0">
            <div className="space-y-6">
              {' '}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> 
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> 
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="flex justify-end space-x-4">
                <Skeleton className="h-10 w-12" /> 
                <Skeleton className="h-10 w-20" /> 
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Await resolve={teacher}>
        {(resolvedTeacher) => <CourseForm teacher={resolvedTeacher} actionData={actionData} />}
      </Await>
    </Suspense>
  );
}

function CourseForm({
  teacher,
  actionData,
}: {
  teacher: { id: string; email: string; role: string };
  actionData: ActionData | undefined;
}) {
  const headerActions = (
    <Button asChild variant="outline">
      <a href="/teacher/dashboard">
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回儀表板
      </a>
    </Button>
  );

  return (
    <div>
      <PageHeader title="建立課程" subtitle="為您的學生設立新課程" actions={headerActions} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>課程資訊</CardTitle>
            <CardDescription>提供您課程的基本資訊。您可以稍後新增作業區域。</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  課程名稱 <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" required placeholder="例如：計算機概論" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">課程描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="描述此課程的內容以及對學生的重要資訊..."
                />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button asChild variant="outline">
                  <a href="/teacher/dashboard">取消</a>
                </Button>
                <Button type="submit">建立課程</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
