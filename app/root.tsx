// root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, redirect } from 'react-router';
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
};

type LoaderData = {
  user: User | null;
  isPublicPath: boolean;
  versionInfo: VersionInfo | null;
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

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip auth for static assets (non-page routes)
  if (
    path.startsWith('/assets/') ||
    path.includes('.css') ||
    path.includes('.js') ||
    path.includes('.ico') ||
    path.includes('.png') ||
    path.includes('.jpg') ||
    path.includes('.svg') ||
    path.startsWith('/__')  
  ) {
    return { user: null, isPublicPath: true, versionInfo: null };
  }

  const getVersionInfoLocal = async () => {
    try {
      const { getVersionInfo } = await import('@/services/version.server');
      return getVersionInfo();
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
  };

  // Define public paths that don't require authentication
  const PUBLIC_PATHS = [
    '/auth',
    '/login',
    '/api',
    '/health',
  ];

  // Check if this is a public path (but still get user if available)
  const isPublicPath = PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));
  
  if (isPublicPath) {
    // For public paths, try to get user but don't require auth
    try {
      const { getUser } = await import('@/services/auth.server');
      const [user, versionInfo] = await Promise.all([
        getUser(request),
        getVersionInfoLocal()
      ]);
      
      // If user is authenticated and on login page, redirect to appropriate dashboard
      if (user && path === '/auth/login') {
        const redirectPath = user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
        throw redirect(redirectPath);
      }
      
      return { user, isPublicPath: true, versionInfo };
    } catch (error) {
      const versionInfo = await getVersionInfoLocal();
      return { user: null, isPublicPath: true, versionInfo };
    }
  }

  // For protected paths, require authentication
  try {
    const { requireAuth } = await import('@/services/auth.server');
    const [user, versionInfo] = await Promise.all([
      requireAuth(request),
      getVersionInfoLocal()
    ]);

    // Role-based redirection for legacy routes
    if (path === '/dashboard') {
      const redirectPath = user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
      throw redirect(redirectPath);
    }

    // Check role-based access for protected routes
    if (path.startsWith('/teacher/') && user.role !== 'TEACHER') {
      throw redirect('/auth/unauthorized');
    }
    
    if (path.startsWith('/student/') && user.role !== 'STUDENT') {
      throw redirect('/auth/unauthorized');
    }

    return { user, isPublicPath: false, versionInfo };
  } catch (error) {
    // If auth fails, redirect to login
    throw redirect('/auth/login');
  }
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
      <body className="min-h-screen w-full font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Layout() {
  const { user, isPublicPath, versionInfo } = useLoaderData() as LoaderData;
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  // Unified layout structure for all route types
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
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

