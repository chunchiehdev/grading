import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { useState, useCallback } from "react";
import stylesheet from "./tailwind.css?url";
import Sidebar from "./components/sidebar/Sidebar";
import { cn } from "@/lib/utils";
import { NavHeader } from "@/components/navbar/NavHeader";
import { ThemeProvider } from "./components/theme-provider";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/x-icon", href: "/rubber-duck.ico" },
  { rel: "stylesheet", href: stylesheet },
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

export function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);
  return (
    <html lang="zh-TW" className="h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-background">
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
                  onSidebarToggle={toggleSidebar}
                  onShare={() => console.log("Share clicked")}
                  userName="User"
                  className="bg-background/80 backdrop-blur-sm border-b border-border"
                />
                <main className="p-8">{children}</main>
              </div>
            </div>
          </div>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}