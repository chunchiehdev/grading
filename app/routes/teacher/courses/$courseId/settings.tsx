import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, Form, Link } from 'react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, deleteCourse } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: { id: string; name: string; description: string | null };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  if (!courseId) throw new Response('Course ID is required', { status: 400 });

  const course = await getCourseById(courseId, teacher.id);
  if (!course) throw new Response('Course not found', { status: 404 });

  return { teacher, course };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  if (!courseId) throw new Response('Course ID is required', { status: 400 });

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const ok = await deleteCourse(courseId, teacher.id);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Failed to delete course' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/teacher/courses');
  }

  return new Response(JSON.stringify({ error: 'Invalid intent' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default function CourseSettings() {
  const { course } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['course', 'common']);
  
  return (
    <div>
      <PageHeader>
        <div className="flex items-center justify-start pt-2">
          <Button asChild variant="outline">
            <Link to={`/teacher/courses/${course.id}`}>{t('common:back')}</Link>
          </Button>
        </div>
      </PageHeader>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('course:settings.dangerZone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{t('course:settings.deleteWarning')}</AlertDescription>
            </Alert>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <Button
                type="submit"
                variant="destructive"
                onClick={(e) => {
                  if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('course:settings.deleteCourse')}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
