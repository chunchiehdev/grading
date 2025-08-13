import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, updateCourse } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: { id: string; name: string; description: string | null };
}

interface ActionData {
  error?: string;
  success?: boolean;
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
  const intent = (formData.get('intent') as string) || 'update';

  if (intent !== 'update') {
    return { error: 'Invalid intent' };
  }

  const name = (formData.get('name') as string) || '';
  const description = (formData.get('description') as string) || '';

  if (!name || name.trim().length === 0) {
    return { error: 'Course name is required' };
  }

  try {
    const updated = await updateCourse(courseId, teacher.id, {
      name: name.trim(),
      description: description?.trim() || undefined,
    });

    if (!updated) {
      return { error: 'Failed to update course' };
    }

    return redirect(`/teacher/courses/${courseId}`);
  } catch (error) {
    console.error('Error updating course:', error);
    return { error: 'An error occurred while updating the course' };
  }
}

export default function EditCourse() {
  const { course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const headerActions = (
    <Button asChild variant="outline">
      <Link to={`/teacher/courses/${course.id}`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Course
      </Link>
    </Button>
  );

  return (
    <div>
      <PageHeader title="Edit Course" subtitle="Update course details" actions={headerActions} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>Modify the name and description of this course.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <input type="hidden" name="intent" value="update" />

              <div className="space-y-2">
                <Label htmlFor="name">
                  Course Name <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" required defaultValue={course.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea id="description" name="description" rows={4} defaultValue={course.description || ''} />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button asChild variant="outline">
                  <Link to={`/teacher/courses/${course.id}`}>Cancel</Link>
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

