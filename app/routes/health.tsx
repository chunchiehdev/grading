import { useRouteError, isRouteErrorResponse } from 'react-router';
import { checkHealth } from '@/utils/healthCheck.server';
import { ErrorPage } from '@/components/errors/ErrorPage';
export async function loader() {
  const health = await checkHealth();
  const response = {
    status: health.status,
    timestamp: health.timestamp,
    message: health.status === 'healthy' ? 'Service is healthy' : 'Service is unhealthy',
  };

  const statusCode = health.status === 'healthy' ? 200 : 500;

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
