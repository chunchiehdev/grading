import { useRouteError, isRouteErrorResponse } from 'react-router';
import { useState } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { ErrorPage } from '@/components/errors/ErrorPage';

/**
 * Landing page with loading screen
 */
export default function WabiSabiLanding() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      {/* {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />} */}
      <HeroSection />
    </>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
