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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
    path.startsWith('/__')  // React Router internal routes
  ) {
    return { user: null, isPublicPath: true };
  }

  // Check if this is a public path (but still get user if available)
  const isPublicPath = PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));
  
  if (isPublicPath) {
    // For public paths, try to get user but don't require auth
    try {
      const { getUser } = await import('@/services/auth.server');
      const user = await getUser(request);
      return { user, isPublicPath: true };
    } catch (error) {
      return { user: null, isPublicPath: true };
    }
  }

  // For protected paths, require authentication
  try {
    const user = await requireAuth(request);
    return { user, isPublicPath: false };
  } catch (error) {
    return redirect('/auth/login');
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
  const { user, isPublicPath } = useLoaderData() as LoaderData;
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  // Public paths without user - show minimal layout
  if (isPublicPath && !user) {
    return (
      <main className="min-h-screen w-full">
        <Outlet />
      </main>
    );
  }

  // Public paths with user - show layout with NavHeader
  if (isPublicPath && user) {
    return (
      <div className="relative flex min-h-screen w-full">
        <div className="flex-1">
          <NavHeader className="bg-background/80 backdrop-blur-sm border-b border-border" />
          <main className="min-h-screen w-full">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Protected paths - show full layout
  return (
    <div className="relative flex min-h-screen w-full">
      {/* <Sidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} /> */}
      <div
        className={cn(
          'flex-1 transition-all duration-300 ease-in-out',
          'md:ml-[260px]',
          sidebarCollapsed && 'md:ml-[20px]'
        )}
      >
        <NavHeader className="bg-background/80 backdrop-blur-sm border-b border-border" />
        <main className="p-8 flex justify-center items-center">
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

