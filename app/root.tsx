// root.tsx - 主要根佈局文件
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  redirect
} from "react-router";
import { ThemeProvider } from "@/theme-provider";
import { commonLinks, commonMeta } from "@/utils/layout-utils";
import { useState, useCallback } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import { cn } from "@/lib/utils";
import { NavHeader } from "@/components/navbar/NavHeader";
import { getUser } from "@/services/auth.server";

export const links = commonLinks;
export const meta = commonMeta;

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 定義公共路徑
  const publicPaths = [
    "/auth/login",
    "/register",
    "/auth/google",       
    "/auth/google/callback",     
  ];

  // 檢查是否為公共路徑
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // 處理首頁的特殊邏輯
  if (pathname === "/") {
    if (user) {
      return redirect("/dashboard");
    }
    return { user, isPublicPath: true };
  }

  // 處理非公共路徑的認證
  if (!user && !isPublicPath) {
    return redirect("/auth/login");
  }

  return { user, isPublicPath };
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
      <body className="min-h-screen bg-background">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Layout() {
  const { user } = useLoaderData<typeof loader>();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  if (!user) {
    return (
      <main className="min-h-screen">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          "md:ml-[260px]",
          isCollapsed && "md:ml-[20px]"
        )}
      >
        <NavHeader
          onShare={() => console.log("Share clicked")}
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
    <ThemeProvider specifiedTheme={null}>
      <Document>
        <Layout />
      </Document>
    </ThemeProvider>
  );
}

// 錯誤邊界
export function ErrorBoundary() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#ffebee', 
      color: '#b71c1c', 
      margin: '20px', 
      borderRadius: '8px' 
    }}>
      <h1>出現錯誤</h1>
      <p>應用程序遇到了問題，請稍後再試。</p>
      <a 
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007BFF',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px'
        }}
      >
        返回首頁
      </a>
    </div>
  );
} 