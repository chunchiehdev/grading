import { Outlet } from 'react-router';
import Background from '@/components/landing/Background';

// No loader needed - let root.tsx handle all auth
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
