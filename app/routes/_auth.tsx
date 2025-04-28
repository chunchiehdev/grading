// routes/_auth.tsx
import { Outlet, useLocation } from "@remix-run/react";
import { ThreeScene } from "@/components/auth/ThreeScene";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  return (
    <main className="grid grid-cols-1 gap-4 min-[1000px]:grid-cols-2">
      <div className="flex items-center min-h-[97vh] w-full py-6">
        <div className="flex flex-col h-full w-full items-center justify-between">
          {/* Logo */}
          <div className="pr-2">
            <img
              src="/crab.svg"
              alt="Crab Icon"
              className="h-20 mb-4 "
            />
            
          </div>
          
          <div>
            <h2 className="text-center text-text-100 tracking-tighter font-medium mt-12 leading-[1em] min-[500px]:text-[3.5rem] min-[350px]:text-[3.2rem] text-[1.75rem]">
              <div>{isRegister ? '創建新帳號' : '登入您的帳號'}</div>
            </h2>

            <div className="mt-8 mx-4 sm:mx-auto p-7 max-w-md border-2 border-gray-300 dark:border-border rounded-[2rem] flex flex-col gap-6 bg-background shadow-[0_2px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_48px_rgba(0,0,0,0.08)]">
              <Outlet />
            </div>
          </div>

          {/* 下面 */}
          <div className="flex justify-center mt-12">
            <a
              href="#"
              className="inline-block px-5 py-2 rounded-full text-base text-muted-foreground font-medium transition-colors hover:text-foreground hover:border-gray-500 group border-[1px] border-gray-300 dark:hover:border-gray-300 dark:border-border shadow-sm"
            >
              需要幫助？
            </a>
          </div>
        </div>
      </div>

      {/* 右邊 - Three.js 場景 */}
      <div className="hidden min-[500px]:flex justify-center">
        <div className="relative md:rounded-xl bg-muted h-[clamp(40rem,97vh,97vh)] w-[clamp(30rem,100%,100%)] flex justify-center items-center overflow-hidden">
          <ThreeScene className="absolute inset-0 w-full h-full" />
          <div className="absolute bottom-6 left-6 text-sm text-white opacity-70 z-10">            
          </div>
        </div>
      </div>
    </main>
  );
}
