import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useState, useCallback } from "react";
import stylesheet from "./tailwind.css?url";
import Sidebar from "./components/sidebar/Sidebar";
import { cn } from "@/lib/utils";
import { NavHeader } from "@/components/navbar/NavHeader";
import {
  PreventFlashOnWrongTheme,
  ThemeProvider,
  useTheme,
} from "remix-themes";
import { themeSessionResolver } from "./sessions.server";
import { redirect } from "@remix-run/node";
import { getUser } from "@/services/auth.server";

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

export async function loader({ request }: LoaderFunctionArgs) {
  const { getTheme } = await themeSessionResolver(request);

  const user = await getUser(request);

  const publicPaths = [
    "/login",
    "/register",
    "/auth/google",       
    "/auth/callback",     
  ];

  const url = new URL(request.url);
  console.log("url", url)
  const isPublicPath = publicPaths.some(path => url.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    return redirect("/login");
  }

  return {
    theme: getTheme(),
    user,
  };
}

function Document({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const [theme] = useTheme();

  return (
    <html
      lang="zh-TW"
      className={cn(
        theme === "dark" ? "dark" : "",
        "h-full antialiased",
        "selection:bg-accent selection:text-accent-foreground"
      )}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
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
  const data = useLoaderData<typeof loader>();
  const user = data.user;
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
          onSidebarToggle={toggleSidebar}
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
  const data = useLoaderData<typeof loader>();
  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction="/set-theme">
      <Document>
        <Layout />
      </Document>
    </ThemeProvider>
  );
}
