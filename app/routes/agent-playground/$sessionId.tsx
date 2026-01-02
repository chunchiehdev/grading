/**
 * Agent Playground Session Page - Existing Chat
 *
 * Loads and displays a specific agent conversation session
 */

import { useRouteError, isRouteErrorResponse } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { AgentChatBoxWithSteps } from '@/components/agent/AgentChatBoxWithSteps';
import { ErrorPage } from '@/components/errors/ErrorPage';

export const meta: MetaFunction = () => {
  return [
    { title: 'AI Agent Chat - Learn AI SDK 6 Beta' },
    {
      name: 'description',
      content: 'Continue your conversation with AI agents',
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { getUser } = await import('@/services/auth.server');
  const user = await getUser(request);
  
  // Validate sessionId exists
  if (!params.sessionId) {
    throw new Response('Session ID is required', { status: 400 });
  }
  
  return { user, sessionId: params.sessionId };
}

export default function AgentPlaygroundSession() {
  return (
    <div className="h-full w-full">
      <AgentChatBoxWithSteps />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <ErrorPage statusCode={404} messageKey="errors.sessionNotFound" returnTo="/agent-playground" />;
    }
    if (error.status === 403) {
      return <ErrorPage statusCode={403} messageKey="errors.unauthorized" returnTo="/agent-playground" />;
    }
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/agent-playground" />;
}
