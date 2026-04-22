import { useRouteError, isRouteErrorResponse } from 'react-router';
import type { MetaFunction } from 'react-router';
import { PrismaLanding } from '@/components/landing/EntireLanding';
import { ErrorPage } from '@/components/errors/ErrorPage';

export const meta: MetaFunction = () => {
  return [
    { title: 'Lumos Grade' },
    {
      name: 'description',
      content:
        'Lumos Grade turns assignments into dialogue. Students upload work, receive AI follow-up questions, and strengthen their reasoning through guided feedback.',
    },
  ];
};

/**
 * Landing page - Prisma: Modern Human-Centric Minimalist Design
 */
export default function LandingPage() {
  // const [isloading, setIsLoading] = useState(true);
  // const handleLoadingComplete = () => {
  //   setIsLoading(false);
  // }

  return <PrismaLanding />;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
