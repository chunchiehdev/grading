// root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, redirect, useLocation } from 'react-router';
import { ThemeProvider } from '@/theme-provider';
import './tailwind.css';
import { NavHeader } from '@/components/navbar/NavHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PUBLIC_PATHS, FULL_WIDTH_PROTECTED_PATHS } from '@/constants/auth';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { VersionInfo } from '@/services/version.server';
import { useTranslation } from 'react-i18next';
import { getServerLocale } from './localization/i18n';
import { useCallback, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { getSession, commitSession } from '@/sessions.server';
import { toast as sonnerToast } from 'sonner';
import { useWebSocket, useWebSocketEvent } from '@/lib/websocket';
import type { SubmissionNotification } from '@/lib/websocket/types';
import { StoreInitializer } from '@/components/store/StoreInitializer';
import { useSubmissionStore } from '@/stores/submissionStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

export type User = {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN' | null;
};

type LoaderData = {
  user: User | null;
  isPublicPath: boolean;
  versionInfo: VersionInfo | null;
  locale: string;
  toast?: { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null;
  podInfo: {
    podName: string | undefined;
    podIP: string | undefined;
    nodeName: string | undefined;
  };
  unreadNotifications?: any[];
};

export const links = () => [
  { rel: 'icon', type: 'image/x-icon', href: '/site-icon.ico' },
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
      environment: 'development',
    };
  }
}

async function getUserSafe(request: Request): Promise<User | null> {
  try {
    const { getUser } = await import('@/services/auth.server');
    return await getUser(request);
  } catch (error) {
    console.error(' root.tsx getUserSafe error:', error);
    return null;
  }
}

function isStaticAsset(path: string) {
  return path.startsWith('/assets/') || /\.(css|js|ico|png|jpg|svg)$/.test(path) || path.startsWith('/__');
}

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => {
    // Exact match for root path '/'
    if (publicPath === '/') {
      return path === '/';
    }
    // For other paths, use startsWith
    return path.startsWith(publicPath);
  });
}

function isFullWidthPath(path: string): boolean {
  return FULL_WIDTH_PROTECTED_PATHS.some((fullWidthPath) => {
    return path.startsWith(fullWidthPath);
  });
}

export function getRoleBasedDashboard(userRole: string): string {
  // ADMIN users access the teacher dashboard (with additional admin features)
  if (userRole === 'ADMIN' || userRole === 'TEACHER') {
    return '/teacher';
  }
  return '/student';
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
    const podInfo = {
      podName: process.env.POD_NAME,
      podIP: process.env.POD_IP,
      nodeName: process.env.NODE_NAME,
    };
    const body = { user: null, isPublicPath: true, versionInfo: null, locale, toast, podInfo };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(body), { headers });
  }

  const versionInfo = await getVersionInfoSafe();
  const podInfo = {
    podName: process.env.POD_NAME,
    podIP: process.env.POD_IP,
    nodeName: process.env.NODE_NAME,
  };

  // Get user once for all paths
  const user = await getUserSafe(request);

  // Fetch recent notifications for teachers and admins (both read and unread)
  let unreadNotifications: any[] = [];
  if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
    try {
      const { getRecentNotifications } = await import('@/services/notification.server');
      const notifications = await getRecentNotifications(user.id, 50);
      unreadNotifications = notifications.map((notif) => ({
        id: notif.id,
        type: notif.type,
        userId: notif.userId,
        title: notif.title,
        message: notif.message,
        courseId: notif.courseId,
        assignmentId: notif.assignmentId,
        course: notif.course,
        assignment: notif.assignment,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        data: notif.data,
      }));
    } catch (error) {
      console.error('[Root Loader] ❌ Failed to fetch notifications:', error);
    }
  }

  // Handle public paths
  if (isPublicPath(path)) {
    if (user && path === '/auth/login') {
      if (user.role) {
        throw redirect(getRoleBasedDashboard(user.role));
      }
      throw redirect('/auth/select-role');
    }

    const body = { user, isPublicPath: true, versionInfo, locale, toast, podInfo, unreadNotifications };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(body), { headers });
  }

  // Handle protected paths - require authentication
  // If authentication failed, redirect to login with redirectTo
  if (!user) {
    throw redirect(`/auth/login?redirectTo=${encodeURIComponent(path)}`);
  }

  if (!user.role && path !== '/auth/select-role') {
    throw redirect('/auth/select-role');
  }

  // Handle legacy dashboard route
  if (path === '/dashboard') {
    if (user.role) {
      throw redirect(getRoleBasedDashboard(user.role));
    }
  }

  const body = { user, isPublicPath: false, versionInfo, locale, toast, podInfo, unreadNotifications };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(JSON.stringify(body), { headers });
}

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        {/* Theme color for Safari toolbar - matches page background */}
        <meta name="theme-color" content="#EDEBE8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1A1A1A" media="(prefers-color-scheme: dark)" />
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
  const { user, isPublicPath, locale, toast, unreadNotifications } = useLoaderData() as LoaderData;
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const isFullWidth = isFullWidthPath(currentPath);

  const { connectionState, isConnected } = useWebSocket(user?.id && user?.role ? user.id : undefined);

  // Get submission store action for teachers
  const handleNewSubmission = useSubmissionStore((state) => state.handleNewSubmission);

  const onSubmissionNotification = useCallback(
    async (notification: SubmissionNotification) => {
      // Update submission store (will increment unread count)
      await handleNewSubmission(notification);
    },
    [handleNewSubmission]
  );

  // Register WebSocket event listener for teachers (works on ALL pages)
  useWebSocketEvent('submission-notification', onSubmissionNotification);

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
    <div className="h-full w-full flex flex-col bg-background">
      {/* Initialize Zustand store with server-provided notification data */}
      {user?.role === 'TEACHER' && <StoreInitializer unreadNotifications={unreadNotifications} />}

      {/* Conditional NavHeader - only show for authenticated users or protected paths */}
      {(user || !isPublicPath) && <NavHeader className="flex-shrink-0" />}

      {/* Main content area - fills remaining viewport space */}
      <main className="flex-1">
        {!isPublicPath && !isFullWidth ? (
          // Protected paths with padding: standard layout with responsive padding
          <div className="h-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 py-6">
            <Outlet />
          </div>
        ) : (
          // Public paths OR full-width protected paths: full control, no extra wrapper
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
