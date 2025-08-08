import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, useSearchParams, Link } from 'react-router';
import { CheckCircle, AlertCircle, Users, User, Calendar, ArrowLeft } from 'lucide-react';

import { requireAuth } from '@/services/auth.server';
import { validateInvitationCode, useInvitationCode, type InvitationValidation } from '@/services/invitation.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData {
  user: { id: string; email: string; role: string; name: string };
  validation: InvitationValidation;
  invitationCode?: string;
}

interface ActionData {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const user = await requireAuth(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Response('Invitation code is required', { status: 400 });
  }

  try {
    const validation = await validateInvitationCode(code, user.id);
    
    return {
      user,
      validation,
      invitationCode: code,
    };
  } catch (error) {
    console.error('Error validating invitation:', error);
    throw new Response('Failed to validate invitation', { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs): Promise<ActionData> {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const code = formData.get('code') as string;

  if (!code) {
    return {
      success: false,
      error: 'Invitation code is required',
    };
  }

  try {
    const result = await useInvitationCode(code, user.id);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Redirect to student dashboard after successful enrollment
    const redirectTo = user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard';
    throw redirect(redirectTo);
  } catch (error) {
    console.error('Error using invitation code:', error);
    return {
      success: false,
      error: 'Failed to join course. Please try again.',
    };
  }
}

export default function JoinCourse() {
  const { user, validation, invitationCode } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();

  const headerActions = (
    <Button asChild variant="outline">
      <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
    </Button>
  );

  // Invalid invitation code
  if (!validation.isValid) {
    return (
      <div>
        <PageHeader
          title="Invalid Invitation"
          subtitle="The invitation code you're trying to use is not valid"
          actions={headerActions}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Invitation Not Valid
                </h3>
                <p className="text-gray-600 mb-6">
                  {validation.error}
                </p>

                {validation.course && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Course Information
                    </h4>
                    <p className="text-sm text-gray-600">
                      <strong>Course:</strong> {validation.course.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Teacher:</strong> {validation.course.teacher.name} ({validation.course.teacher.email})
                    </p>
                    {validation.course.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {validation.course.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Please contact your teacher to get a new invitation code.
                  </p>
                  
                  <Button asChild className="w-full">
                    <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                      Return to Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // User is already enrolled
  if (validation.isAlreadyEnrolled) {
    return (
      <div>
        <PageHeader
          title="Already Enrolled"
          subtitle="You're already a member of this course"
          actions={headerActions}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  You're Already Enrolled!
                </h3>
                <p className="text-gray-600 mb-6">
                  You're already a member of this course and can access all assignments.
                </p>

                {validation.course && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div className="text-left">
                        <h4 className="font-medium text-green-900 mb-1">
                          {validation.course.name}
                        </h4>
                        <p className="text-sm text-green-700">
                          <strong>Teacher:</strong> {validation.course.teacher.name}
                        </p>
                        {validation.course.description && (
                          <p className="text-sm text-green-700 mt-1">
                            {validation.course.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="flex-1">
                    <Link to="/student/assignments">
                      View Assignments
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/student/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Valid invitation - show course info and join button
  return (
    <div>
      <PageHeader
        title="Join Course"
        subtitle="You've been invited to join a course"
        actions={headerActions}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Course Invitation
            </CardTitle>
            <CardDescription>
              Review the course details below and click "Join Course" to enroll.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {validation.course && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-900 mb-3">
                  {validation.course.name}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-blue-700">
                    <User className="h-4 w-4 mr-2" />
                    <span><strong>Teacher:</strong> {validation.course.teacher.name}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-blue-700">
                    <span><strong>Email:</strong> {validation.course.teacher.email}</span>
                  </div>
                  
                  {validation.course.description && (
                    <div className="mt-4">
                      <p className="text-sm text-blue-700">
                        <strong>Description:</strong>
                      </p>
                      <p className="text-sm text-blue-600 mt-1 leading-relaxed">
                        {validation.course.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User role notice for non-students */}
            {user.role !== 'STUDENT' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> You're currently logged in as a {user.role.toLowerCase()}. 
                  Course enrollment is typically for students, but you can still join if needed.
                </AlertDescription>
              </Alert>
            )}

            {/* Action error display */}
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {/* Join form */}
            <Form method="post" className="space-y-4">
              <input type="hidden" name="code" value={invitationCode} />
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  What happens when you join?
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You'll be enrolled in the course</li>
                  <li>• You can view and submit assignments</li>
                  <li>• You'll receive AI-powered grading and feedback</li>
                  <li>• The invitation code will be marked as used</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                    Cancel
                  </Link>
                </Button>
                <Button type="submit" className="flex-1">
                  Join Course
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
