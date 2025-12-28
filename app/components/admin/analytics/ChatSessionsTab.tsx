/**
 * Chat Sessions Tab
 * 
 * Display and filter agent chat sessions
 */

import { useEffect, useState } from 'react';
import { Calendar, MessageSquare, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatSession {
  id: string;
  title: string | null;
  userRole: string;
  totalTokens: number;
  totalDuration: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    picture?: string | null;
  };
  _count: {
    messages: number;
    stepLogs: number;
  };
}

export function ChatSessionsTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', status: '' });

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.status]); // Only re-fetch when filter values change

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);
      
      const response = await fetch(`/api/admin/analytics/chat-sessions?${params}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Filters - Sketch style */}
      <div className="mb-6 flex gap-4">
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="rounded-sm border-2 border-[#2B2B2B] bg-white px-4 py-2 text-sm focus:border-[#D2691E] focus:outline-none focus:ring-2 focus:ring-[#D2691E]/20"
        >
          <option value="">All Roles</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-sm border-2 border-[#2B2B2B] bg-white px-4 py-2 text-sm focus:border-[#D2691E] focus:outline-none focus:ring-2 focus:ring-[#D2691E]/20"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-sm border-2 border-[#2B2B2B] bg-white sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2B2B2B] bg-[#FAF9F6]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Messages
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Tokens
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr
                  key={session.id}
                  className="transition-colors hover:bg-[#D2691E]/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.title || 'Untitled'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-[#2B2B2B] dark:border-gray-200">
                        <AvatarImage src={session.user.picture || undefined} alt={session.user.name} />
                        <AvatarFallback className="bg-transparent font-serif text-[#2B2B2B] dark:text-gray-200">
                          {session.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {session.user.name}
                        </div>
                        <div className="text-xs text-gray-500">{session.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-[#D2691E] bg-[#D2691E]/10 px-2 py-1 text-xs font-medium text-[#D2691E]">
                      {session.userRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {session._count.messages}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatTokens(session.totalTokens)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {formatDuration(session.totalDuration)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* Mobile Card View */}
      <div className="space-y-4 sm:hidden">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No sessions found</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-sm border-2 border-[#2B2B2B] bg-white p-4"
            >
              {/* Row 1: User & Status */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="border-2 border-[#2B2B2B] dark:border-gray-200">
                    <AvatarImage src={session.user.picture || undefined} alt={session.user.name} />
                    <AvatarFallback className="bg-transparent font-serif text-[#2B2B2B] dark:text-gray-200">
                      {session.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">
                      {session.user.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.user.email}
                    </div>
                  </div>
                </div>
                <StatusBadge status={session.status} />
              </div>

              <hr className="my-3 border-gray-100" />

              {/* Row 2: Session Title */}
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{session.title || 'Untitled'}</span>
                </div>
                <div className="ml-6 text-xs text-gray-500">
                  {new Date(session.createdAt).toLocaleDateString()} • {new Date(session.createdAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Row 3: Metrics */}
              <div className="flex items-center justify-between rounded-sm border border-gray-100 bg-gray-50/50 p-3">
                <div>
                  <div className="text-xs text-gray-500">Role</div>
                  <span className="inline-flex rounded-full border border-[#D2691E] bg-[#D2691E]/10 px-2 py-0.5 text-xs font-medium text-[#D2691E]">
                    {session.userRole}
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-xs text-gray-500">Messages</div>
                  <span className="font-medium text-gray-900">
                    {session._count.messages}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500">Tokens</div>
                  <div className="font-medium text-gray-900">
                    {formatTokens(session.totalTokens)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    ACTIVE: 'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    ERROR: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'
      }`}
    >
      {status}
    </span>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
