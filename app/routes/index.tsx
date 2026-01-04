import { useRouteError, isRouteErrorResponse } from 'react-router';
import { PrismaLanding } from '@/components/landing/PrismaLanding';
import { ErrorPage } from '@/components/errors/ErrorPage';

/**
 * Landing page - Prisma: Modern Human-Centric Minimalist Design
 */
export default function LandingPage() {
  return <PrismaLanding />;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
