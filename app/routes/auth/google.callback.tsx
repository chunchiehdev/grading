import { useRouteError, isRouteErrorResponse } from 'react-router';
import { handleGoogleCallback } from '@/services/auth.server';
import { ErrorPage } from '@/components/errors/ErrorPage';

export async function loader({ request }: { request: Request }) {
  return await handleGoogleCallback(request);
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
