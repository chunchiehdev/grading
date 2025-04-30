// root.tsx - 主要根佈局文件
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  redirect,
} from "react-router";
import { ThemeProvider } from "@/theme-provider";
import { useState, useCallback } from "react";
import "./tailwind.css";
import Sidebar from "@/components/sidebar/Sidebar";
import { cn } from "@/lib/utils";
import { NavHeader } from "@/components/navbar/NavHeader";
import { getUser } from "@/services/auth.server";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PUBLIC_PATHS = [
  "/auth/login",
  "/register",
  "/auth/google",       
  "/auth/google/callback",     
] as const;

type LoaderFunctionArgs = {
  request: Request;
};

type User = {
  id: string;
  email: string;
  name: string;
};

type LoaderData = {
  user: User | null;
  isPublicPath: boolean;
};

export const links = () => [
  { rel: "icon", type: "image/x-icon", href: "/rubber-duck.ico" },
  { rel: "stylesheet", href: "./tailwind.css" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap",
  },
];

export const meta = () => [
  { title: "Grading System" },
  { name: "description", content: "A grading system application" }
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  const url = new URL(request.url);
  const isPublicPath = PUBLIC_PATHS.some((path) => url.pathname.startsWith(path));

  if (url.pathname === "/") {
    if (user) {
      return redirect("/dashboard");
    }
    return Response.json({ user, isPublicPath: true });
  }

  if (!user && !isPublicPath) {
    return redirect("/auth/login");
  }

  return Response.json({ user, isPublicPath });
}

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen w-full bg-background font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Layout() {
  const { user } = useLoaderData() as LoaderData;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  if (!user) {
    return (
      <main className="min-h-screen w-full bg-background">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          "md:ml-[260px]",
          isCollapsed && "md:ml-[20px]"
        )}
      >
        <NavHeader
          user={user}
          className="bg-background/80 backdrop-blur-sm border-b border-border"
        />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>

    <ThemeProvider specifiedTheme={null}>
      <Document>
        <Layout />
      </Document>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

// 錯誤邊界
export function ErrorBoundary() {
  return (
    <div className="p-5 m-5 rounded-lg bg-destructive/10 text-destructive">
      <h1 className="text-xl font-bold mb-2">發生錯誤</h1>
      <p>應用程序遇到了問題，請稍後再試。</p>
      <a 
        href="/"
        className="inline-block mt-5 px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        返回首頁
      </a>
    </div>
  );
} 