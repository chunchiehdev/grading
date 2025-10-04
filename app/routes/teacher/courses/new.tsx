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
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: Promise<{ id: string; email: string; role: string }>;
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacherPromise = new Promise<{ id: string; email: string; role: string }>(async (resolve) => {
    await new Promise((res) => setTimeout(res, 1000));
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
  const { t } = useTranslation(['course', 'common']);

  return (
    <div>
      <PageHeader title={t('course:create')} subtitle={t('course:createSubtitle')} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('course:courseInfo')}</CardTitle>
            <CardDescription>{t('course:createDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('course:name')} <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" required placeholder={t('course:namePlaceholder')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('course:description')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder={t('course:descriptionPlaceholder')}
                />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button asChild variant="outline">
                  <a href="/teacher/dashboard">{t('common:cancel')}</a>
                </Button>
                <Button type="submit">{t('course:create')}</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
