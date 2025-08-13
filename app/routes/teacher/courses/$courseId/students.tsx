import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, Form, Link, useActionData } from 'react-router';
import { Users, ArrowLeft, Trash2 } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById } from '@/services/course.server';
import { getCourseEnrollments, unenrollStudent } from '@/services/enrollment.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: { id: string; name: string };
  students: Array<{ id: string; name: string; email: string; picture: string | null; enrolledAt: Date; formattedEnrolledDate: string }>; 
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

  const enrollments = await getCourseEnrollments(courseId, teacher.id);
  const students = enrollments.map((e) => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
    picture: e.student.picture || null,
    enrolledAt: e.enrolledAt,
    formattedEnrolledDate: new Date(e.enrolledAt).toLocaleDateString('en-CA'),
  }));

  return { teacher, course: { id: course.id, name: course.name }, students };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  if (!courseId) throw new Response('Course ID is required', { status: 400 });

  const formData = await request.formData();
  const intent = formData.get('intent');
  if (intent !== 'removeStudent') {
    return { error: 'Invalid intent' };
  }
  const studentId = formData.get('studentId') as string;
  if (!studentId) {
    return { error: 'studentId is required' };
  }

  const ok = await unenrollStudent(studentId, courseId, teacher.id);
  if (!ok) {
    return { error: 'Failed to remove student from course' };
  }

  return redirect(`/teacher/courses/${courseId}/students`);
}

export default function CourseStudents() {
  const { course, students } = useLoaderData<typeof loader>();
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
      <PageHeader title={`Students`} subtitle={course.name} actions={headerActions} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enrolled Students
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {actionData?.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {students.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No students enrolled yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {s.picture ? (
                              <AvatarImage src={s.picture} alt={s.name} />
                            ) : (
                              <AvatarFallback>{s.name?.slice(0, 1) || 'S'}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{s.email}</TableCell>
                      <TableCell className="text-gray-600">{s.formattedEnrolledDate}</TableCell>
                      <TableCell className="text-right">
                        <Form method="post" className="inline-block">
                          <input type="hidden" name="intent" value="removeStudent" />
                          <input type="hidden" name="studentId" value={s.id} />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              if (!confirm(`Remove ${s.name} from this course?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </Form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
