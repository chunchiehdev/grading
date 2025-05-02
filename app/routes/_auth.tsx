import { Outlet, useLocation, redirect } from 'react-router';
import { getUser } from '@/services/auth.server';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // If it's the logout path, allow access regardless of login state
  if (path === '/auth/logout') {
    return { user: null };
  }
  ``;

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
    <main className="grid grid-cols-1 gap-4 min-[1000px]:grid-cols-2">
      <div className="flex items-center min-h-[97vh] w-full py-6">
        <div className="flex flex-col h-full w-full items-center justify-between">
          {/* Logo */}
          <div className="pr-2">
            <img src="/crab.svg" alt="Crab Icon" className="h-20 mb-4" />
          </div>

          <div>
            <div className="mt-8 mx-4 sm:mx-auto p-7 max-w-md border border-input rounded-[2rem] flex flex-col gap-6 bg-background shadow-[0_2px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_48px_rgba(0,0,0,0.08)] transition-shadow duration-500">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
