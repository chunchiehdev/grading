import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, useNavigation } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { updateUserRole } from '@/services/auth.server';

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

  // If user already has a role assigned (not default STUDENT), redirect them
  if (user.role && user.role !== 'STUDENT') {
    const redirectPath = user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
    throw redirect(redirectPath);
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

  // Redirect to appropriate dashboard after successful role update
  const redirectPath = selectedRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
  throw redirect(redirectPath);
}

export interface SelectRoleProps {}

export function SelectRolePage(_: SelectRoleProps) {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const { t } = useTranslation('auth');

  const handleRoleSelect = (role: 'TEACHER' | 'STUDENT') => {
    // Create form and submit
    const form = document.createElement('form');
    form.method = 'post';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'role';
    input.value = role;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="size-full flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-3">{t('selectRolePage.title')}</h1>
          <p className="text-muted-foreground">{t('selectRolePage.subtitle')}</p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Teacher Card */}
          <div className="group relative bg-card border border-border rounded-3xl p-10 hover:shadow-2xl hover:border-primary/30 transition-all duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-primary">{t('selectRolePage.teacher.badge')}</span>
              </div>
              <h2 className="mb-4">{t('selectRolePage.teacher.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('selectRolePage.teacher.description')}</p>
            </div>

            <ul className="space-y-3 mb-10">
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>{t('selectRolePage.teacher.feature1')}</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>{t('selectRolePage.teacher.feature2')}</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>{t('selectRolePage.teacher.feature3')}</span>
              </li>
            </ul>

            <button
              onClick={() => handleRoleSelect('TEACHER')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity group-hover:gap-3 transition-all disabled:pointer-events-none disabled:opacity-75"
            >
              <span>{isSubmitting ? t('selectRolePage.savingButton') : t('selectRolePage.continueAsTeacher')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Student Card */}
          <div className="group relative bg-card border border-border rounded-3xl p-10 hover:shadow-2xl hover:border-primary/30 transition-all duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/80 rounded-full mb-6">
                <div className="w-2 h-2 rounded-full bg-secondary-foreground" />
                <span className="text-sm">{t('selectRolePage.student.badge')}</span>
              </div>
              <h2 className="mb-4">{t('selectRolePage.student.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('selectRolePage.student.description')}</p>
            </div>

            <ul className="space-y-3 mb-10">
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary-foreground" />
                </div>
                <span>{t('selectRolePage.student.feature1')}</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary-foreground" />
                </div>
                <span>{t('selectRolePage.student.feature2')}</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary-foreground" />
                </div>
                <span>{t('selectRolePage.student.feature3')}</span>
              </li>
            </ul>

            <button
              onClick={() => handleRoleSelect('STUDENT')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity group-hover:gap-3 transition-all disabled:pointer-events-none disabled:opacity-75"
            >
              <span>{isSubmitting ? t('selectRolePage.savingButton') : t('selectRolePage.continueAsStudent')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">{t('selectRolePage.roleChangeHint')}</p>
        </div>
      </div>
    </div>
  );
}

export default SelectRolePage;
