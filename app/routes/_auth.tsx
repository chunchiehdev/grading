// routes/_auth.tsx
import { Outlet, useLocation } from "@remix-run/react";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-secondary dark:bg-secondary p-8 rounded-lg shadow-lg">
        <div className="text-center">
          {isRegister ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                建立帳號
              </h2>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                登入
              </h2>
              
            </>
          )}
        </div>
        <Outlet />
      </div>
    </div>
  );
}