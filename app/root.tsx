// root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, redirect, useLocation } from 'react-router';
import { ThemeProvider } from '@/theme-provider';
import './tailwind.css';
import Sidebar from '@/components/sidebar/Sidebar';
import { cn } from '@/lib/utils';
import { NavHeader } from '@/components/navbar/NavHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { requireAuth } from '@/middleware/auth.server';
import { PUBLIC_PATHS } from '@/constants/auth';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useUiStore } from '@/stores/uiStore';
import { FooterVersion } from '@/components/VersionInfo';
import type { VersionInfo } from '@/services/version.server';
import { useTranslation } from 'react-i18next';
import { getServerLocale } from './localization/i18n';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { getSession, commitSession } from '@/sessions.server';
import { toast as sonnerToast } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

export type  User = {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'TEACHER' | 'STUDENT' | null;

};

type LoaderData = {
  user: User | null;
  isPublicPath: boolean;
  versionInfo: VersionInfo | null;
  locale: string;
  toast?: { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null;
};

export const links = () => [
  { rel: 'icon', type: 'image/x-icon', href: '/rubber-duck.ico' },
  { rel: 'stylesheet', href: '/tailwind.css' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap',
  },
  {
    rel: 'modulepreload',
    href: 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs',
  },
];

export const meta = () => [
  { title: 'Grading System' },
  { name: 'description', content: 'A grading system application' },
];

async function getVersionInfoSafe(): Promise<VersionInfo> {
  try {
    const { getVersionInfo } = await import('@/services/version.server');
    return await getVersionInfo();
  } catch (error) {
    console.error('Failed to get version info:', error);
    return {
      version: '1.0.0',
      branch: 'unknown',
      commitHash: 'unknown',
      buildTime: new Date().toISOString(),
      environment: 'development'
    };
  }
}

async function getUserSafe(request: Request): Promise<User | null> {
  try {
    const { getUser } = await import('@/services/auth.server');
    return await getUser(request);
  } catch (error) {
    return null;
  }
}

async function requireAuthSafe(request: Request): Promise<User | null> {
  try {
    const { requireAuth } = await import('@/services/auth.server');
    return await requireAuth(request);
  } catch (error) {
    return null;
  }
}

function isStaticAsset(path: string) {
  return (
    path.startsWith('/assets/') ||
    /\.(css|js|ico|png|jpg|svg)$/.test(path) ||
    path.startsWith('/__')
  );
}

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));
}

export function getRoleBasedDashboard(userRole: string): string {
  return userRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
}
// Not needed for our simple i18next setup

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const locale = getServerLocale(request);
  const session = await getSession(request);
  const toast = session.get('toast') || null;
  const setCookie = toast ? await commitSession(session) : null;

  // Early return for static assets
  if (isStaticAsset(path)) {
    const body = { user: null, isPublicPath: true, versionInfo: null, locale, toast };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(body), { headers });
  }

  const versionInfo = await getVersionInfoSafe();

  // Handle public paths
  if (isPublicPath(path)) {
    const user = await getUserSafe(request);
    
    if (user && path === '/auth/login') {
      if (user.role) {
        throw redirect(getRoleBasedDashboard(user.role));
      }
        throw redirect('/auth/select-role');
    }
    
    const body = { user, isPublicPath: true, versionInfo, locale, toast };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(body), { headers });
  }

  // Handle protected paths - require authentication
  const user = await requireAuthSafe(request);
  
  // If authentication failed, redirect to login
  if (!user) {
    throw redirect('/auth/login');
  }

  if (!user.role && path !== '/auth/select-role') {
    throw redirect('/auth/select-role');
  }

  // Handle legacy dashboard route
  if (path === '/dashboard') {
    throw redirect(getRoleBasedDashboard(user.role as string));
  }

  // Role-based access control
  if (path.startsWith('/teacher/') && user.role !== 'TEACHER') {
    throw redirect('/auth/unauthorized');
  }
  
  if (path.startsWith('/student/') && user.role !== 'STUDENT') {
    throw redirect('/auth/unauthorized');
  }

  const body = { user, isPublicPath: false, versionInfo, locale, toast };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(JSON.stringify(body), { headers });
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
        <script 
          src="https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs" 
          type="module"
        ></script>
      </head>
      <body className="bg-background min-h-screen w-full font-sans antialiased">
        {children}
        <Toaster richColors />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Layout() {
  const { user, isPublicPath, versionInfo, locale, toast } = useLoaderData() as LoaderData;
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { i18n } = useTranslation();
  const location = useLocation();
  
  // Change language when locale from server changes
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  // Show one-time toast messages from session flash
  useEffect(() => {
    if (toast && toast.message) {
      const t = toast as NonNullable<LoaderData['toast']>;
      switch (t.type) {
        case 'success':
          sonnerToast.success(t.message);
          break;
        case 'error':
          sonnerToast.error(t.message);
          break;
        case 'warning':
          sonnerToast.warning ? sonnerToast.warning(t.message) : sonnerToast(t.message);
          break;
        default:
          sonnerToast(t.message);
      }
    }
  }, [toast]);

  // Unified layout structure for all route types
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Conditional NavHeader - only show for authenticated users or protected paths */}
      {(user || !isPublicPath) && (
        <NavHeader className="flex-shrink-0" />
      )}
      
      {/* Main content area with controlled overflow */}
      <main className="flex-1 overflow-auto">
        {!isPublicPath ? (
          // Protected paths get padding
          <div className="p-8">
            <Outlet />
          </div>
        ) : (
          // Public paths get no padding for full control
          <Outlet />
        )}
      </main>
      
      {/* Footer - always present but flexible */}
      {/* <FooterVersion versionInfo={versionInfo} className="flex-shrink-0" /> */}
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
