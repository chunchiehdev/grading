import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Await, Link } from 'react-router';
import { Suspense, useState } from 'react';
import { ArrowLeft, Plus, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import { createAssignmentArea, type CreateAssignmentAreaData } from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';

interface LoaderData {
  teacher: Promise<{ id: string; email: string; role: string; name: string }>;
  course: CourseInfo;
  rubrics: any[];
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  const [course, rubricsResult] = await Promise.all([
    getCourseById(courseId, teacher.id),
    listRubrics(teacher.id),
  ]);

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  // Create a promise for the teacher to enable Suspense
  const teacherPromise = new Promise<{ id: string; email: string; role: string; name: string }>(async (resolve) => {
    await new Promise((res) => setTimeout(res, 100)); // Small delay for demo
    resolve(teacher);
  });

  return { 
    teacher: teacherPromise, 
    course, 
    rubrics: rubricsResult.rubrics?.filter((r: any) => r.isActive) || []
  };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  const formData = await request.formData();

  if (!courseId) {
    return { success: false, error: 'Course ID is required' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const rubricId = formData.get('rubricId') as string;
  const dueDate = formData.get('dueDate') as string;

  // Basic validation
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Assignment name is required' };
  }

  if (!rubricId) {
    return { success: false, error: 'Please select a rubric' };
  }

  try {
    const assignmentData: CreateAssignmentAreaData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      rubricId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    const assignment = await createAssignmentArea(teacher.id, courseId, assignmentData);
    
    // Redirect to the manage page for the newly created assignment
    throw redirect(`/teacher/courses/${courseId}/assignments/${assignment.id}/manage`);
  } catch (error) {
    console.error('Error creating assignment area:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create assignment. Please try again.'
    };
  }
}

export default function NewAssignmentArea() {
  const { teacher, course, rubrics } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  // Complete Skeleton that matches final layout exactly
  const PageSkeleton = () => (
    <div className="bg-background text-foreground">
      {/* PageHeader Skeleton */}
      <header className="bg-background py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-9 w-64" /> {/* Title */}
              <div className="mt-3 px-1">
                <Skeleton className="h-5 w-80" /> {/* Subtitle */}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" /> {/* Back button */}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content Skeleton */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          {/* CardHeader */}
          <div className="flex flex-col space-y-1.5 p-6">
            <Skeleton className="h-6 w-32" /> {/* CardTitle */}
            <Skeleton className="h-4 w-96" /> {/* CardDescription */}
          </div>
          
          {/* CardContent */}
          <div className="p-6 pt-0">
            <div className="space-y-6">
              {/* Assignment Name */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-24 w-full" /> {/* Textarea */}
              </div>
              {/* Rubric Selection */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Select */}
              </div>
              {/* Due Date */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Date input */}
              </div>
              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Skeleton className="h-10 w-16" /> {/* Cancel */}
                <Skeleton className="h-10 w-24" /> {/* Create */}
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
        {(resolvedTeacher) => (
          <AssignmentForm teacher={resolvedTeacher} course={course} rubrics={rubrics} actionData={actionData} />
        )}
      </Await>
    </Suspense>
  );
}

function AssignmentForm({ 
  teacher, 
  course, 
  rubrics, 
  actionData 
}: { 
  teacher: { id: string; email: string; role: string; name: string };
  course: CourseInfo;
  rubrics: LoaderData['rubrics'];
  actionData: ActionData | undefined;
}) {
  const headerActions = (
    <Button asChild variant="outline">
      <Link to={`/teacher/courses/${course.id}`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Course
      </Link>
    </Button>
  );

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title="Create Assignment Area"
        subtitle={`Add a new assignment area to ${course.name}`}
        actions={headerActions}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-card text-card-foreground border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Assignment Details
            </CardTitle>
            <CardDescription>
              Create a new assignment area where students can submit their work for grading.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Assignment Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., Essay on Data Structures"
                  className="bg-background border-border focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Provide details about what students need to submit..."
                  className="bg-background border-border focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rubricId">
                  Grading Rubric <span className="text-destructive">*</span>
                </Label>
                <Select name="rubricId" required>
                  <SelectTrigger className="bg-background border-border focus:ring-ring">
                    <SelectValue placeholder="Select a rubric for grading" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {rubrics.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No rubrics available. <Link to="/teacher/rubrics/new" className="text-primary hover:underline">Create one first</Link>.
                      </div>
                    ) : (
                      rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          <div>
                            <div className="font-medium">{rubric.name}</div>
                            {rubric.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {rubric.description}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  
                  Due Date (Optional)
                </Label>
                <DatePicker name="dueDate" />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button asChild variant="outline">
                  <Link to={`/teacher/courses/${course.id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={rubrics.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function DatePicker({ name }: { name: string }) {
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <div>
      {/* Hidden input to submit ISO date back to the server */}
      <input type="hidden" name={name} value={date ? date.toISOString() : ''} />
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              data-empty={!date}
              className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <UICalendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {date && (
          <Button type="button" variant="ghost" onClick={() => setDate(undefined)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
