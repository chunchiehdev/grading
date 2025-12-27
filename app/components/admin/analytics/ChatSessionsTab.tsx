/**
 * Chat Sessions Tab
 * 
 * Display and filter agent chat sessions
 */

import { useEffect, useState } from 'react';
import { Calendar, MessageSquare, Clock, User } from 'lucide-react';

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

      {/* Table - Architectural sketch style */}
      <div className="overflow-hidden rounded-sm border-2 border-[#2B2B2B] bg-white">
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
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
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
