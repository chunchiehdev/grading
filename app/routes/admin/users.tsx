import { useState } from 'react';
import { useFetcher, useLoaderData } from 'react-router';
import type { Route } from './+types/users';
import { requireAdmin } from '@/services/auth.server';

/**
 * Admin User Management Page
 * Displays all users with sorting and deletion capabilities
 */

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  picture: string;
  createdAt: string;
  hasSelectedRole: boolean;
}

interface UserStats {
  total: number;
  students: number;
  teachers: number;
  admins: number;
}

interface UsersData {
  users: User[];
  stats: UserStats;
}

type SortField = 'createdAt' | 'name' | 'role';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [data, setData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const deleteFetcher = useFetcher();

  // Fetch users with sorting
  const fetchUsers = async (sortField: SortField, order: SortOrder) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users?sortBy=${sortField}&order=${order}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const result: UsersData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and get current user
  useState(() => {
    fetchUsers(sortBy, sortOrder);
    // Get current user ID from auth check
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) setCurrentUserId(data.userId);
      })
      .catch(() => {});
  });

  // Handle sort change
  const handleSort = (field: SortField) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    fetchUsers(field, newOrder);
  };

  // Handle delete user
  const handleDelete = (userId: string) => {
    deleteFetcher.submit(
      {},
      {
        method: 'DELETE',
        action: `/api/admin/users/${userId}`,
      }
    );
    setDeleteUserId(null);
    // Refresh users after deletion
    setTimeout(() => fetchUsers(sortBy, sortOrder), 500);
  };

  // Role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'STUDENT':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <span className="text-muted-foreground ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-destructive">Error</h2>
            <p className="text-foreground/80 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8">
          <p className="text-lg text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage all system users</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Users</p>
            <p className="text-2xl font-bold text-foreground">{data.stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Students</p>
            <p className="text-2xl font-bold text-green-600">{data.stats.students}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Teachers</p>
            <p className="text-2xl font-bold text-blue-600">{data.stats.teachers}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Admins</p>
            <p className="text-2xl font-bold text-red-600">{data.stats.admins}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Avatar</th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                    onClick={() => handleSort('name')}
                  >
                    Name <SortIndicator field="name" />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                    onClick={() => handleSort('role')}
                  >
                    Role <SortIndicator field="role" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                    onClick={() => handleSort('createdAt')}
                  >
                    Registered <SortIndicator field="createdAt" />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-10 h-10 rounded-full border border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{user.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{formatDate(user.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteUserId(user.id)}
                        disabled={user.id === currentUserId}
                        className={`px-3 py-1 text-sm rounded border transition-colors ${
                          user.id === currentUserId
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive hover:text-white'
                        }`}
                      >
                        {user.id === currentUserId ? 'You' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-foreground mb-3">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this user? This action cannot be undone and will remove all associated
              data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteUserId(null)}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteUserId)}
                className="px-4 py-2 text-sm bg-destructive text-white rounded hover:bg-destructive/90 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
