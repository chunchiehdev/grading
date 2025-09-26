import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { getSession, commitSession } from '@/sessions.server';
import { useLoaderData, useActionData, Form, useSearchParams, Link } from 'react-router';
import { CheckCircle, AlertCircle, Users, User, Calendar, ArrowLeft } from 'lucide-react';

import { getUser } from '@/services/auth.server';
import { validateInvitationCode, useInvitationCode, type InvitationValidation } from '@/services/invitation.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from 'react-i18next';

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
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
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

export async function action({ request }: ActionFunctionArgs): Promise<ActionData | Response> {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
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

    // Set a flash toast message in session and redirect to dashboard
    const session = await getSession(request);
    session.flash('toast', { type: 'success', message: 'Successfully joined the course!' });
    const cookie = await commitSession(session);
    const redirectTo = user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard';
    const res = redirect(redirectTo);
    res.headers.set('Set-Cookie', cookie);
    return res;
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
  const { t } = useTranslation(['course', 'common']);

  const headerActions = (
    <Button asChild variant="outline">
      <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common:backToDashboard')}
      </Link>
    </Button>
  );

  // Invalid invitation code
  if (!validation.isValid) {
    return (
      <div>
        <PageHeader
          title={t('course:joinCourse.invalidTitle')}
          subtitle={t('course:joinCourse.invalidSubtitle')}
          actions={headerActions}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('course:joinCourse.notValid')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {validation.error}
                </p>

                {validation.course && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t('course:joinCourse.courseInfo')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      <strong>{t('course:course')}:</strong> {validation.course.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>{t('course:instructor', { name: validation.course.teacher.name })}:</strong> ({validation.course.teacher.email})
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
                    {t('course:joinCourse.contactTeacher')}
                  </p>
                  
                  <Button asChild className="w-full">
                    <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                      {t('course:joinCourse.returnToDashboard')}
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
          title={t('course:joinCourse.alreadyEnrolledTitle')}
          subtitle={t('course:joinCourse.alreadyEnrolledSubtitle')}
          actions={headerActions}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('course:joinCourse.alreadyEnrolled')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('course:joinCourse.alreadyMember')}
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
                          <strong>{t('course:instructor', { name: validation.course.teacher.name })}</strong>
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
                      {t('course:viewAssignments')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/student/dashboard">
                      {t('course:joinCourse.goToDashboard')}
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
        title={t('course:joinCourse.title')}
        subtitle={t('course:joinCourse.subtitle')}
        actions={headerActions}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('course:joinCourse.invitation')}
            </CardTitle>
            <CardDescription>
              {t('course:joinCourse.reviewDetails')}
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
                    <span><strong>{t('course:instructor' )}:</strong> {validation.course.teacher.name}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-blue-700">
                    <span><strong>{t('course:student.email')}:</strong> {validation.course.teacher.email}</span>
                  </div>
                  
                  {validation.course.description && (
                    <div className="mt-4">
                      <p className="text-sm text-blue-700">
                        <strong>{t('course:description')}:</strong>
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
                  <strong>{t('common:info')}:</strong> {t('course:joinCourse.roleNote', { role: user.role.toLowerCase() })}
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
                  {t('course:joinCourse.whatHappens')}
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t('course:joinCourse.benefits.enrolled')}</li>
                  <li>• {t('course:joinCourse.benefits.viewSubmit')}</li>
                  <li>• {t('course:joinCourse.benefits.aiGrading')}</li>
                  <li>• {t('course:joinCourse.benefits.codeUsed')}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                    {t('common:cancel')}
                  </Link>
                </Button>
                <Button type="submit" className="flex-1">
                  {t('course:joinCourse.joinCourse')}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
