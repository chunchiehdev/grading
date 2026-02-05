import { useRouteError, isRouteErrorResponse, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, useNavigation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

import { updateUserRole } from '@/services/auth.server';
import { ErrorPage } from '@/components/errors/ErrorPage';

interface LoaderData {
  user: { id: string; name: string; email: string; role: string };
}

interface ActionData {
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const { getUser } = await import('@/services/auth.server');
  const user = await getUser(request);

  if (!user) {
    throw redirect('/auth/login');
  }

  // If user has already selected a role, redirect them to the appropriate dashboard
  if (user.hasSelectedRole) {
    const { getSession, commitSession } = await import('@/sessions.server');
    const { isSafeRedirectPath } = await import('@/utils/redirect.server');

    const session = await getSession(request);
    const savedRedirectTo = session.get('redirectTo');

    let redirectPath;
    if (savedRedirectTo && typeof savedRedirectTo === 'string' && isSafeRedirectPath(savedRedirectTo)) {
      redirectPath = savedRedirectTo;
      session.unset('redirectTo');
    } else {
      const { getRoleBasedDashboard } = await import('@/root');
      redirectPath = getRoleBasedDashboard(user.role || 'STUDENT');
    }

    const response = redirect(redirectPath);
    if (savedRedirectTo) {
      const cookie = await commitSession(session);
      response.headers.set('Set-Cookie', cookie);
    }
    throw response;
  }

  return { user };
}

export async function action({ request }: ActionFunctionArgs) {
  // 直接使用 getUser 而不是 requireAuth，避免重複調用
  const { getUser } = await import('@/services/auth.server');
  const user = await getUser(request);

  if (!user) {
    throw redirect('/auth/login');
  }
  const formData = await request.formData();
  const selectedRole = formData.get('role') as string;

  if (!selectedRole || (selectedRole !== 'TEACHER' && selectedRole !== 'STUDENT')) {
    throw new Response(JSON.stringify({ error: 'Please select a valid role' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await updateUserRole(user.id, selectedRole as 'TEACHER' | 'STUDENT');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Response(JSON.stringify({ error: 'Failed to update role. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check for saved redirectTo in session
  const { getSession, commitSession } = await import('@/sessions.server');
  const { isSafeRedirectPath } = await import('@/utils/redirect.server');

  const session = await getSession(request);
  const savedRedirectTo = session.get('redirectTo');

  let redirectPath;
  if (savedRedirectTo && typeof savedRedirectTo === 'string' && isSafeRedirectPath(savedRedirectTo)) {
    redirectPath = savedRedirectTo;
    session.unset('redirectTo');
  } else {
    redirectPath = selectedRole === 'TEACHER' ? '/teacher' : '/student';
  }

  const response = redirect(redirectPath);
  if (savedRedirectTo) {
    const cookie = await commitSession(session);
    response.headers.set('Set-Cookie', cookie);
  }
  throw response;
}

export interface SelectRoleProps {}

export function SelectRolePage(_: SelectRoleProps) {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const { t } = useTranslation('auth');
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'STUDENT' | null>(null);

  const handleConfirm = () => {
    if (!selectedRole || isSubmitting) return;

    const form = document.createElement('form');
    form.method = 'post';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'role';
    input.value = selectedRole;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="h-full w-full bg-background flex items-center justify-center px-4 py-4 overflow-hidden">
      <div className="w-full max-w-6xl h-full flex flex-col justify-center py-2">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-1 text-foreground">
            {t('selectRolePage.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('selectRolePage.subtitle')}</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Student Card */}
          <div
            onClick={() => setSelectedRole('STUDENT')}
            className={`group relative bg-card rounded-2xl p-3 sm:p-4 transition-all duration-300 cursor-pointer text-center flex flex-col h-full overflow-hidden ${
              selectedRole === 'STUDENT'
                ? 'border-2 border-primary shadow-lg ring-4 ring-primary/20'
                : 'border-2 border-border hover:shadow-lg hover:border-foreground/20'
            } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {/* Selected Indicator */}
            {selectedRole === 'STUDENT' && (
              <div className="absolute top-2 left-2 w-6 h-6 bg-[hsl(var(--accent-emphasis))] rounded-full flex items-center justify-center z-10">
                <Check className="w-3.5 h-3.5 text-[hsl(var(--accent-emphasis-foreground))]" />
              </div>
            )}

            {/* Image - 7/10 of card */}
            <div className="flex-[7] flex items-center justify-center min-h-0">
              <div className="w-full h-full mx-auto p-2">
                <img
                  src="/student.png"
                  alt="Student"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-lighten group-hover:scale-105 transition-transform duration-300"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            </div>

            {/* Content - 3/10 of card */}
            <div className="flex-[3] flex flex-col justify-center px-2 relative">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                {t('selectRolePage.student.title')}
              </h2>

              {/* Arrow button in bottom right corner */}
              {selectedRole === 'STUDENT' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirm();
                  }}
                  disabled={isSubmitting}
                  className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 bg-[hsl(var(--accent-emphasis))] text-[hsl(var(--accent-emphasis-foreground))] rounded-full flex items-center justify-center hover:bg-[hsl(var(--accent-emphasis))]/80 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-lg animate-in fade-in zoom-in duration-300"
                  aria-label={isSubmitting ? t('selectRolePage.savingButton') : 'Confirm student role'}
                >
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Teacher Card */}
          <div
            onClick={() => setSelectedRole('TEACHER')}
            className={`group relative bg-card rounded-2xl p-3 sm:p-4 transition-all duration-300 cursor-pointer text-center flex flex-col h-full overflow-hidden ${
              selectedRole === 'TEACHER'
                ? 'border-2 border-primary shadow-lg ring-4 ring-primary/20'
                : 'border-2 border-border hover:shadow-lg hover:border-foreground/20'
            } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {/* Selected Indicator */}
            {selectedRole === 'TEACHER' && (
              <div className="absolute top-2 left-2 w-6 h-6 bg-[hsl(var(--accent-emphasis))] rounded-full flex items-center justify-center z-10">
                <Check className="w-3.5 h-3.5 text-[hsl(var(--accent-emphasis-foreground))]" />
              </div>
            )}

            {/* Image - 7/10 of card */}
            <div className="flex-[7] flex items-center justify-center min-h-0">
              <div className="w-full h-full mx-auto p-2">
                <img
                  src="/teacher.png"
                  alt="Teacher"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-lighten group-hover:scale-105 transition-transform duration-300"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            </div>

            {/* Content - 3/10 of card */}
            <div className="flex-[3] flex flex-col justify-center px-2 relative">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                {t('selectRolePage.teacher.title')}
              </h2>

              {/* Arrow button in bottom right corner */}
              {selectedRole === 'TEACHER' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirm();
                  }}
                  disabled={isSubmitting}
                  className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 bg-[hsl(var(--accent-emphasis))] text-[hsl(var(--accent-emphasis-foreground))] rounded-full flex items-center justify-center hover:bg-[hsl(var(--accent-emphasis))]/80 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-lg animate-in fade-in zoom-in duration-300"
                  aria-label={isSubmitting ? t('selectRolePage.savingButton') : 'Confirm teacher role'}
                >
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-3 flex-shrink-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{t('selectRolePage.roleChangeHint')}</p>
        </div>
      </div>
    </div>
  );
}

export default SelectRolePage;
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
