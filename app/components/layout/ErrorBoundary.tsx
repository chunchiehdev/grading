import { useState, useEffect } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      console.error("Caught error:", event.error);
      setHasError(true);
      setError(event.error?.toString() || "發生未知錯誤");
      event.preventDefault();
    };

    window.addEventListener('error', handleErrors);
    
    return () => {
      window.removeEventListener('error', handleErrors);
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-5 m-5 rounded-lg bg-destructive/10 text-destructive">
        <h1 className="text-xl font-bold mb-2">發生錯誤</h1>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return children;
} 