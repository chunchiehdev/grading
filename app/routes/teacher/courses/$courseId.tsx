import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { ArrowLeft, Plus, FileText, Users, QrCode, Copy, RefreshCw, Share2, Pencil, Settings as SettingsIcon } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import { getActiveCourseInvitation, createInvitationCode, generateInvitationQRCode } from '@/services/invitation.server';
import { getCourseEnrollmentStats } from '@/services/enrollment.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: CourseInfo & {
    assignmentAreas?: Array<{
      id: string;
      name: string;
      description: string | null;
      dueDate: Date | null;
      rubricId: string;
      formattedDueDate?: string;
      _count?: { submissions: number };
    }>;
  };
  formattedCreatedDate: string;
  invitation?: {
    id: string;
    code: string;
    expiresAt: Date;
    qrCodeUrl: string;
  };
  enrollmentStats: {
    totalEnrollments: number;
    recentEnrollments: Array<{
      student: {
        id: string;
        email: string;
        name: string;
      };
      enrolledAt: Date;
    }>;
  };
}

interface ActionData {
  success?: boolean;
  error?: string;
  newInvitation?: {
    code: string;
    qrCodeUrl: string;
  };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  
  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  try {
    const [course, activeInvitation, enrollmentStats] = await Promise.all([
      getCourseById(courseId, teacher.id),
      getActiveCourseInvitation(courseId, teacher.id),
      getCourseEnrollmentStats(courseId, teacher.id),
    ]);

    if (!course) {
      throw new Response('Course not found', { status: 404 });
    }
    
    // Import date formatter on server side only
    const { formatDateForDisplay } = await import('@/lib/date.server');
    const formattedCreatedDate = formatDateForDisplay(course.createdAt);
    
    // Format assignment area due dates
    const courseWithFormattedDates = {
      ...course,
      assignmentAreas: course.assignmentAreas?.map((area: any) => ({
        ...area,
        formattedDueDate: area.dueDate ? formatDateForDisplay(area.dueDate) : undefined,
      }))
    };

    // Generate QR code for active invitation if exists
    let invitation = undefined;
    if (activeInvitation) {
      const qrCodeUrl = await generateInvitationQRCode(activeInvitation.code);
      invitation = {
        id: activeInvitation.id,
        code: activeInvitation.code,
        expiresAt: activeInvitation.expiresAt,
        qrCodeUrl,
      };
    }
    
    return { 
      teacher, 
      course: courseWithFormattedDates, 
      formattedCreatedDate,
      invitation,
      enrollmentStats,
    };
  } catch (error) {
    console.error('Error loading course:', error);
    throw new Response('Course not found', { status: 404 });
  }
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (!courseId) {
    return { success: false, error: 'Course ID is required' };
  }

  try {
    if (intent === 'generate-invitation') {
      const invitation = await createInvitationCode(courseId, teacher.id);
      const qrCodeUrl = await generateInvitationQRCode(invitation.code);
      
      return {
        success: true,
        newInvitation: {
          code: invitation.code,
          qrCodeUrl,
        },
      };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error) {
    console.error('Error in course action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
}

export default function CourseDetail() {
  const { teacher, course, formattedCreatedDate, invitation, enrollmentStats } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const totalSubmissions = course.assignmentAreas?.reduce((total, area) => 
    total + (area._count?.submissions || 0), 0
  ) || 0;

  // Handle copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const headerActions = (
    <>
      <Button asChild variant="outline">
        <Link to="/teacher/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/students`}>
          <Users className="w-4 h-4 mr-2" />
          Students
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/edit`}>
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/settings`}>
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Link>
      </Button>
      <Button asChild>
        <Link to={`/teacher/courses/${course.id}/assignments/new`}>
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment Area
        </Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title={course.name}
        subtitle={course.description || 'Course management and assignment areas'}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Assignment Areas"
            value={course.assignmentAreas?.length || 0}
            icon={FileText}
            variant="transparent"
          />
          <StatsCard
            title="Total Submissions"
            value={totalSubmissions}
            icon={Users}
            variant="transparent"
          />
          <StatsCard
            title="Enrolled Students"
            value={enrollmentStats.totalEnrollments}
            icon={Users}
            variant="transparent"
          />
          <StatsCard
            title="Created"
            value={formattedCreatedDate}
            icon={FileText}
            variant="transparent"
          />
        </div>

        {/* Course Invitation Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Course Invitation
              </CardTitle>
              {!invitation && (
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Invitation Code
                  </Button>
                </Form>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {actionData?.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {!invitation && !actionData?.newInvitation ? (
              <div className="text-center py-8">
                <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Active Invitation Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Generate an invitation code to allow students to join this course. 
                  The code will be valid for 7 days and include a QR code for easy sharing.
                </p>
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Invitation Code
                  </Button>
                </Form>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Display current or new invitation */}
                {((invitation && !actionData?.newInvitation) || actionData?.newInvitation) && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Invitation Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Invitation Code
                        </label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-3 py-2 rounded-md font-mono text-lg tracking-wider flex-1">
                            {actionData?.newInvitation?.code || invitation?.code}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(actionData?.newInvitation?.code || invitation?.code || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Invitation URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-3 py-2 rounded-md text-sm text-gray-600 flex-1 break-all">
                            {typeof window !== 'undefined' 
                              ? `${window.location.origin}/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                              : `[domain]/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                            }
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(
                              typeof window !== 'undefined' 
                                ? `${window.location.origin}/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                                : `[domain]/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {invitation?.expiresAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Expires At
                          </label>
                          {/* <p className="text-sm text-gray-600">
                            {new Date(invitation.expiresAt).toLocaleString()}
                          </p> */}
                        </div>
                      )}

                      <div className="pt-4">
                        <Form method="post">
                          <input type="hidden" name="intent" value="generate-invitation" />
                          <Button variant="outline" size="sm" type="submit">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Generate New Code
                          </Button>
                        </Form>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                      <label className="text-sm font-medium text-gray-700 mb-4 block">
                        QR Code
                      </label>
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                        <img
                          src={actionData?.newInvitation?.qrCodeUrl || invitation?.qrCodeUrl}
                          alt="Course invitation QR code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Students can scan this QR code to join the course
                      </p>
                    </div>
                  </div>
                )}

                
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Areas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Assignment Areas</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                  + Add Assignment Area
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!course.assignmentAreas || course.assignmentAreas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assignment areas yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create assignment areas to organize student submissions and apply rubrics.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                      Create Assignment Area
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {course.assignmentAreas.map((area) => (
                  <div key={area.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-gray-900">{area.name}</h3>
                          {area.description && (
                            <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                          )}
                        </Link>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span>{area._count?.submissions || 0} submissions</span>
                          {area.formattedDueDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Due {area.formattedDueDate}</span>
                            </>
                          )}
                          {area.rubricId && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-green-600">Has rubric</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/submissions`}>
                            View Submissions
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}>
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 
