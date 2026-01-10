/**
 * Admin Analytics Dashboard
 * 
 * Architectural sketch style dashboard for monitoring agent chats and grading sessions
 */

import { useRouteError, isRouteErrorResponse, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { useState } from 'react';
import { OverviewCards } from '@/components/admin/analytics/OverviewCards';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { ChatSessionsTab } from '@/components/admin/analytics/ChatSessionsTab';
import { GradingSessionsTab } from '@/components/admin/analytics/GradingSessionsTab';

export async function loader({ request }: LoaderFunctionArgs) {
  // Authentication & Authorization
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, email: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new Response('Forbidden: Admin access required', { status: 403 });
  }

  // Fetch initial overview data
  const [totalChatSessions, totalGradingSessions, chatTokenStats, gradingTokenStats] =
    await Promise.all([
      db.agentChatSession.count(),
      db.gradingResult.count({ where: { status: 'COMPLETED' } }),
      db.agentChatSession.aggregate({ _sum: { totalTokens: true } }),
      db.gradingResult.aggregate({ _sum: { gradingTokens: true, sparringTokens: true } }), // Include sparring tokens
    ]);

  const overview = {
    totalChatSessions,
    totalGradingSessions,
    totalTokensUsed:
      (chatTokenStats._sum.totalTokens || 0) + 
      (gradingTokenStats._sum.gradingTokens || 0) + 
      (gradingTokenStats._sum.sparringTokens || 0), // Sum sparring tokens
  };

  return { user, overview };
}

export default function AdminAnalytics() {
  const { user, overview } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<'chats' | 'gradings'>('chats');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-[#2B2B2B] backdrop-blur-sm dark:border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Monitor agent sessions and grading activities
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <OverviewCards data={overview} />

        {/* Tab Navigation - Architectural Sketch Style */}
        <div className="mt-12">
          <div className="relative">
            {/* Hand-drawn tab border */}
            <div className="flex space-x-1 border-b-2 border-[#2B2B2B] dark:border-gray-200">
              <button
                onClick={() => setActiveTab('chats')}
                className={`
                  relative px-6 py-3 font-serif text-lg transition-all
                  ${
                    activeTab === 'chats'
                      ? 'text-[#D2691E] dark:text-[#E87D3E]'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                Chat Sessions
                {activeTab === 'chats' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D2691E] dark:bg-[#E87D3E]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('gradings')}
                className={`
                  relative px-6 py-3 font-serif text-lg transition-all
                  ${
                    activeTab === 'gradings'
                      ? 'text-[#D2691E] dark:text-[#E87D3E]'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                Grading Sessions
                {activeTab === 'gradings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D2691E] dark:bg-[#E87D3E]" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-8">
            {activeTab === 'chats' && <ChatSessionsTab />}
            {activeTab === 'gradings' && <GradingSessionsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.admin" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
