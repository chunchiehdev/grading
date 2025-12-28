import { useRouteError, isRouteErrorResponse } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage
      statusCode={404}
      messageKey="notFound.message"
      returnTo="/"
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.resource"
        returnTo="/"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.message"
      returnTo="/"
    />
  );
}
