/**
 * Grading Sessions Tab
 * 
 * Display and filter grading results
 */

import { useEffect, useState } from 'react';
import { FileText, Award, Clock, AlertCircle, User } from 'lucide-react';

interface GradingSession {
  id: string;
  status: string;
  normalizedScore: number | null;
  confidenceScore: number | null;
  requiresReview: boolean;
  gradingTokens: number | null;
  gradingDuration: number | null;
  createdAt: string;
  uploadedFile: {
    fileName: string;
    userId: string;
    user: {
      name: string;
      email: string;
    };
  };
  assignmentArea: {
    name: string;
  } | null;
  rubric: {
    name: string;
  };
}

export function GradingSessionsTab() {
  const [sessions, setSessions] = useState<GradingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ requiresReview: '' });

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.requiresReview]); // Only re-fetch when filter value changes

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.requiresReview) params.set('requiresReview', filters.requiresReview);
      
      const response = await fetch(`/api/admin/analytics/grading-sessions?${params}`);
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
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filters.requiresReview}
          onChange={(e) => setFilters({ ...filters, requiresReview: e.target.value })}
          className="rounded-sm border-2 border-[#2B2B2B] bg-white px-4 py-2 text-sm focus:border-[#D2691E] focus:outline-none focus:ring-2 focus:ring-[#D2691E]/20"
        >
          <option value="">All</option>
          <option value="true">Requires Review</option>
          <option value="false">No Review Needed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-sm border-2 border-[#2B2B2B] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2B2B2B] bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Assignment
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Rubric
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Tokens
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                Review
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading grading sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No grading sessions found
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
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.uploadedFile.user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.uploadedFile.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {session.uploadedFile.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {session.assignmentArea?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {session.rubric.name}
                  </td>
                  <td className="px-4 py-3">
                    {session.normalizedScore !== null ? (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-[#D2691E]" />
                        <span className="font-medium text-gray-900">
                          {session.normalizedScore.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {session.confidenceScore !== null ? (
                      <ConfidenceBadge score={session.confidenceScore} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {session.gradingTokens?.toLocaleString() || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {session.requiresReview ? (
                      <div className="flex items-center gap-1 text-xs text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        Review
                      </div>
                    ) : (
                      <span className="text-xs text-green-600">✓ OK</span>
                    )}
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

function ConfidenceBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color =
    score > 0.8
      ? 'bg-green-100 text-green-800 border-green-300'
      : score >= 0.6
        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
        : 'bg-red-100 text-red-800 border-red-300';

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${color}`}
    >
      {percentage}%
    </span>
  );
}
