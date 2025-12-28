import { useRouteError, isRouteErrorResponse, Outlet } from 'react-router';
import Background from '@/components/landing/Background';
import { ErrorPage } from '@/components/errors/ErrorPage';

export default function AuthLayout() {
  return (
    <>
      <Background />
      <Outlet />
    </>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
