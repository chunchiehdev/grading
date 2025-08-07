import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form } from 'react-router';
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

interface LoaderData {
  teacher: { id: string; email: string; role: string };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  return { teacher };
}

export async function action({ request }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const formData = await request.formData();
  
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name || name.trim().length === 0) {
    throw new Response(JSON.stringify({ error: 'Course name is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
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
    throw new Response(JSON.stringify({ error: 'Failed to create course. Please try again.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default function NewCourse() {
  const { teacher } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const headerActions = (
    <Button asChild variant="outline">
      <a href="/teacher/dashboard">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </a>
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Create New Course"
        subtitle="Set up a new course for your students"
        actions={headerActions}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Provide basic information about your course. You can add assignment areas later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Course Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., Introduction to Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Describe what this course covers and any important information for students..."
                />
                <p className="text-sm text-muted-foreground">
                  This description will be visible to students when they view assignment areas.
                </p>
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button asChild variant="outline">
                  <a href="/teacher/dashboard">Cancel</a>
                </Button>
                <Button type="submit">Create Course</Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Next Steps Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-blue-900">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="bg-blue-50">
            <div className="text-sm text-blue-800 space-y-2">
              <p>After creating your course, you'll be able to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Create assignment areas within the course</li>
                <li>Designate rubrics for each assignment area</li>
                <li>Set due dates for assignments</li>
                <li>View and grade student submissions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 