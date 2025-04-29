import { Outlet, Scripts, Meta, Links, useNavigate } from "react-router";
import { ThemeProvider } from "@/theme-provider";
import { commonLinks, commonMeta } from "@/utils/layout-utils";
import { useEffect, useState } from "react";

export const links = commonLinks;
export const meta = commonMeta;

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      console.error("Caught error:", event.error);
      setHasError(true);
      setError(event.error?.toString() || "Unknown error occurred");
      event.preventDefault();
    };

    window.addEventListener('error', handleErrors);
    
    return () => {
      window.removeEventListener('error', handleErrors);
    };
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#ffebee', color: '#b71c1c', margin: '20px', borderRadius: '8px' }}>
        <h1>Something went wrong!</h1>
        <p>{error}</p>
      </div>
    );
  }

  return children;
}

function NavBar() {
  const navigate = useNavigate();
  
  return (
    <div style={{ 
      padding: '0.5rem 1rem',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e9ecef',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }} onClick={() => navigate('/')}>
        評分系統
      </div>
      <div>
        <button 
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            marginLeft: '0.5rem',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/auth/login')}
        >
          登入
        </button>
      </div>
    </div>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("Root layout mounted");
    return () => console.log("Root layout unmounted");
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider specifiedTheme={null}>
          <NavBar />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
} 