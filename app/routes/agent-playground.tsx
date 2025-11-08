/**
 * Agent Playground Page
 *
 * Interactive playground for learning about AI SDK 6 Beta agents
 */

import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { AgentChatBoxWithSteps } from '@/components/agent/AgentChatBoxWithSteps';
import type { User } from '@/root';

export const meta: MetaFunction = () => {
  return [
    { title: 'AI Agent Playground - Learn AI SDK 6 Beta' },
    {
      name: 'description',
      content: 'Interactive playground for learning about AI SDK 6 Beta agents with multi-step reasoning and tool calling',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { getUser } = await import('@/services/auth.server');
  const user = await getUser(request);
  return { user };
}

export default function AgentPlayground() {
  return (
    <div
      className="h-full w-full"
    >
      <AgentChatBoxWithSteps />
    </div>
  );
}
