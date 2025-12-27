import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Route } from './+types/users';
import { requireAdmin } from '@/services/auth.server';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * Admin User Management Page
 * Architectural sketch style for user management
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
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN' | null>(null);
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
    toast.success('User deleted successfully');
    // Refresh users after deletion
    setTimeout(() => fetchUsers(sortBy, sortOrder), 500);
  };

  // Handle role update
  const handleRoleUpdate = async (userId: string, newRole: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      toast.success(`Role updated to ${newRole}`);
      setEditingRoleUserId(null);
      setSelectedRole(null);
      // Refresh users
      fetchUsers(sortBy, sortOrder);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
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
    if (sortBy !== field) return <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">↕</span>;
    return <span className="ml-1 text-xs text-[#D2691E] dark:text-[#E87D3E]">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="border-2 border-[#D2691E] p-8 dark:border-[#E87D3E]">
            <h2 className="font-serif text-xl font-light text-[#D2691E] dark:text-[#E87D3E]">Error</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="font-serif text-lg text-gray-600 dark:text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header - Architectural Sketch Style */}
      <header className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100 sm:text-4xl">
            User Management
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Manage all system users and roles</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Statistics - Sketch Cards */}
        <div className="mb-16 grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          <div className="border-2 border-[#2B2B2B] p-6 dark:border-gray-200">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{data.stats.total}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Students</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              {data.stats.students}
            </p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Teachers</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
              {data.stats.teachers}
            </p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Admins</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{data.stats.admins}</p>
          </div>
        </div>

        {/* Table - Hand-drawn borders */}
        <div className="overflow-x-auto">
          <table className="w-full border-2 border-[#2B2B2B] dark:border-gray-200">
            <thead>
              <tr className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  User
                </th>
                <th
                  className="cursor-pointer px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-[#D2691E] dark:text-gray-400 dark:hover:text-[#E87D3E]"
                  onClick={() => handleSort('name')}
                >
                  Name <SortIndicator field="name" />
                </th>
                <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 sm:table-cell">
                  Email
                </th>
                <th
                  className="cursor-pointer px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-[#D2691E] dark:text-gray-400 dark:hover:text-[#E87D3E]"
                  onClick={() => handleSort('role')}
                >
                  Role <SortIndicator field="role" />
                </th>
                <th
                  className="hidden cursor-pointer px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-[#D2691E] dark:text-gray-400 dark:hover:text-[#E87D3E] md:table-cell"
                  onClick={() => handleSort('createdAt')}
                >
                  Registered <SortIndicator field="createdAt" />
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user, index) => (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-[#D2691E]/5 dark:hover:bg-[#E87D3E]/10 ${
                    index === data.users.length - 1 ? '' : 'border-b border-[#2B2B2B] dark:border-gray-200'
                  }`}
                >
                  <td className="px-4 py-5">
                    <Avatar className="border-2 border-[#2B2B2B] dark:border-gray-200">
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className="bg-transparent font-serif text-[#2B2B2B] dark:text-gray-200">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="px-4 py-5">
                    <p className="font-serif font-light text-[#2B2B2B] dark:text-gray-100">{user.name}</p>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 sm:hidden">{user.email}</p>
                  </td>
                  <td className="hidden px-4 py-5 sm:table-cell">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-5">
                    {editingRoleUserId === user.id ? (
                      <Select
                        value={selectedRole || user.role}
                        onValueChange={(value) =>
                          setSelectedRole(value as 'STUDENT' | 'TEACHER' | 'ADMIN')
                        }
                      >
                        <SelectTrigger className="w-32 border-2 border-[#2B2B2B] dark:border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="TEACHER">Teacher</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-block border-2 border-[#2B2B2B] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#2B2B2B] transition-all dark:border-gray-200 dark:text-gray-200 ${
                          user.id === currentUserId 
                            ? 'cursor-not-allowed opacity-40' 
                            : 'cursor-pointer hover:border-[#D2691E] hover:bg-[#D2691E]/5 hover:text-[#D2691E] dark:hover:border-[#E87D3E] dark:hover:bg-[#E87D3E]/10 dark:hover:text-[#E87D3E]'
                        }`}
                        onClick={() => {
                          if (user.id !== currentUserId) {
                            setEditingRoleUserId(user.id);
                            setSelectedRole(user.role);
                          }
                        }}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-5 md:table-cell">
                    <p className="font-serif text-sm text-gray-600 dark:text-gray-400">{formatDate(user.createdAt)}</p>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex justify-end gap-4">
                      {editingRoleUserId === user.id ? (
                        <>
                          <button
                            onClick={() => handleRoleUpdate(user.id, selectedRole || user.role)}
                            className="text-sm font-medium text-[#2B2B2B] underline-offset-4 hover:text-[#D2691E] hover:underline dark:text-gray-200 dark:hover:text-[#E87D3E]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoleUserId(null);
                              setSelectedRole(null);
                            }}
                            className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-[#2B2B2B] hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteUserId(user.id)}
                          disabled={user.id === currentUserId}
                          className={`text-sm font-medium underline-offset-4 ${
                            user.id === currentUserId
                              ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                              : 'text-[#D2691E] hover:underline dark:text-[#E87D3E]'
                          }`}
                        >
                          {user.id === currentUserId ? 'You' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Delete Confirmation Dialog - Sketch Style */}
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent className="border-2 border-[#2B2B2B] dark:border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this user? This action cannot be undone and will remove all
              associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <button
              onClick={() => setDeleteUserId(null)}
              className="border-2 border-[#2B2B2B] px-6 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteUserId && handleDelete(deleteUserId)}
              className="border-2 border-[#D2691E] bg-[#D2691E] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#D2691E]/90 dark:border-[#E87D3E] dark:bg-[#E87D3E]"
            >
              Delete User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
