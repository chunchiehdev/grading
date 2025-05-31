import { Outlet, useLocation, redirect } from 'react-router';
import { getUser } from '@/services/auth.server';
import Background from '@/components/landing/Background';
export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // If it's the logout path, allow access regardless of login state
  if (path === '/auth/logout') {
    return { user: null };
  }

  // Check if user is already logged in
  const user = await getUser(request);

  // If logged in and trying to access other auth pages, redirect to dashboard
  if (user) {
    return redirect('/dashboard');
  }

  // Otherwise return null to allow access to login page
  return { user: null };
}

export default function AuthLayout() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <Background />

      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 text-center">
          
          <Outlet />
        </div>
      </div>
    </main>
  );
}
