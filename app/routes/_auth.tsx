import { Outlet, useLocation } from "react-router";
import { Button } from "@/components/ui/button";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === "/auth/register";

  return (
    <main className="grid grid-cols-1 gap-4 min-[1000px]:grid-cols-2">
      <div className="flex items-center min-h-[97vh] w-full py-6">
        <div className="flex flex-col h-full w-full items-center justify-between">
          {/* Logo */}
          <div className="pr-2">
            <img
              src="/crab.svg"
              alt="Crab Icon"
              className="h-20 mb-4"
            />
          </div>
          
          <div>
            <h2 className="text-center text-foreground tracking-tighter font-medium mt-12 leading-[1em] min-[500px]:text-[3.5rem] min-[350px]:text-[3.2rem] text-[1.75rem]">
              {isRegister ? "創建新帳號" : "登入您的帳號"}
            </h2>

            <div className="mt-8 mx-4 sm:mx-auto p-7 max-w-md border border-input rounded-[2rem] flex flex-col gap-6 bg-background shadow-[0_2px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_48px_rgba(0,0,0,0.08)] transition-shadow duration-500">
              <Outlet />
            </div>
          </div>

          {/* Bottom help link */}
          <div className="flex justify-center mt-12">
            <Button
              variant="ghost"
              className="px-5 py-2 rounded-full text-base text-muted-foreground font-medium hover:text-foreground hover:border-input border border-input shadow-sm"
            >
              需要幫助？
            </Button>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="hidden min-[1000px]:flex justify-center">
        <div className="relative md:rounded-xl bg-muted h-[clamp(40rem,97vh,97vh)] w-[clamp(30rem,100%,100%)] flex justify-center items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-background/30" />
          <div className="relative z-10 p-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold">智能評分系統</h3>
              <p className="mt-2 text-muted-foreground">
                使用現代科技輔助教學評量，提升教學效能
              </p>
            </div>
            <blockquote className="text-lg italic">
              &ldquo;教育評分系統讓我的工作效率提升了許多，現在我可以更專注於教學品質的提升。&rdquo;
            </blockquote>
            <footer className="text-sm text-muted-foreground">
              李老師，高中數學教師
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
} 