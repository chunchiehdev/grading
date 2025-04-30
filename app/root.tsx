// root.tsx 
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from "@/stores/theme";
import { requireAuth } from "@/middleware/auth.server";
import { PUBLIC_PATHS } from "@/constants/auth";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分鐘
      gcTime: 10 * 60 * 1000, // 10 分鐘
    },
  },
});

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

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 檢查是否為公開路徑
  if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
    return { user: null };
  }

  try {
    const user = await requireAuth(request);
    return { user };
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }
}

function Document({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  
  return (
    <html lang="zh-TW" suppressHydrationWarning className={theme}>
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
      <ThemeProvider>
        <Document>
          <Layout />
        </Document>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
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