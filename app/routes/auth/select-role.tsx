import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router';
import { GraduationCap, User } from 'lucide-react';

import { requireAuth, updateUserRole } from '@/services/auth.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleCard } from '@/components/ui/role-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface LoaderData {
  user: { id: string; name: string, email: string; role: string };
}

interface ActionData {
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  // 直接使用 getUser 而不是 requireAuth，避免重複調用
  // root.tsx 已經處理了認證檢查
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

  return (
    <div className="h-full w-full bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Circles */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-40 right-20 w-20 h-20 bg-secondary/10 rounded-full animate-float-slow opacity-40"></div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-accent/5 rounded-full animate-float opacity-50"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 right-1/3 w-40 h-40 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-xl animate-pulse opacity-30"></div>
        <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-accent/10 to-primary/10 rounded-full blur-xl animate-pulse opacity-25"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-2xl px-6 max-h-full flex items-center">
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl w-full max-h-full overflow-hidden">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-6 p-4 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-3">
                Welcome, {user.name}!
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Choose how you'll use the app to get started
              </p>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-96">
              <Form method="post" className="space-y-6" aria-busy={isSubmitting}>
                <div className="space-y-4">
                  {isSubmitting ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <RoleCard
                        title="Teacher"
                        description="Create courses, manage assignments, and grade student work"
                        icon={GraduationCap}
                        value="TEACHER"
                        name="role"
                        variant="teacher"
                      />

                      <RoleCard
                        title="Student"
                        description="Submit assignments and receive feedback from teachers"
                        icon={User}
                        value="STUDENT"
                        name="role"
                        variant="student"
                      />
                    </>
                  )}
                </div>

                {actionData?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{actionData.error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Continue'}
                </Button>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse"></span>
                  You can change your role later in account settings
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse"></span>
                </p>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

export default SelectRolePage;
