import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Route } from './+types/users';
import { requireAdmin } from '@/services/auth.server';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
 * Minimalist, borderless design with serif typography
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

  // Role badge styling (pill shape, minimal)
  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'TEACHER':
        return 'default';
      case 'STUDENT':
        return 'secondary';
      default:
        return 'secondary';
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
    if (sortBy !== field) return <span className="text-muted-foreground ml-1 text-xs">↕</span>;
    return <span className="ml-1 text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
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
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-destructive/10 p-6">
            <h2 className="font-serif text-xl font-bold text-destructive">Error</h2>
            <p className="mt-2 text-foreground/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-lg text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b pb-6">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            User Management
          </h1>
          <p className="mt-2 text-muted-foreground">Manage all system users and roles</p>
        </div>

        {/* Statistics - Minimal, no borders */}
        <div className="mb-12 grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Users</p>
            <p className="font-serif text-4xl font-bold text-foreground">{data.stats.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Students</p>
            <p className="font-serif text-4xl font-bold text-green-600 dark:text-green-400">
              {data.stats.students}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Teachers</p>
            <p className="font-serif text-4xl font-bold text-blue-600 dark:text-blue-400">
              {data.stats.teachers}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Admins</p>
            <p className="font-serif text-4xl font-bold text-red-600 dark:text-red-400">{data.stats.admins}</p>
          </div>
        </div>

        {/* Table - No outer border, just horizontal dividers */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => handleSort('name')}
                >
                  Name <SortIndicator field="name" />
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Email
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => handleSort('role')}
                >
                  Role <SortIndicator field="role" />
                </th>
                <th
                  className="hidden cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:table-cell"
                  onClick={() => handleSort('createdAt')}
                >
                  Registered <SortIndicator field="createdAt" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-b transition-colors hover:bg-muted/30 ${
                    index === data.users.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-5">
                    <Avatar>
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="px-4 py-5">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground sm:hidden">{user.email}</p>
                  </td>
                  <td className="hidden px-4 py-5 sm:table-cell">
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-5">
                    {editingRoleUserId === user.id ? (
                      <Select
                        value={selectedRole || user.role}
                        onValueChange={(value) =>
                          setSelectedRole(value as 'STUDENT' | 'TEACHER' | 'ADMIN')
                        }
                      >
                        <SelectTrigger className="w-32 border-none bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="TEACHER">Teacher</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={getRoleBadgeVariant(user.role)}
                        className={`cursor-pointer rounded-full ${
                          user.id === currentUserId ? 'cursor-not-allowed opacity-60' : ''
                        }`}
                        onClick={() => {
                          if (user.id !== currentUserId) {
                            setEditingRoleUserId(user.id);
                            setSelectedRole(user.role);
                          }
                        }}
                      >
                        {user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="hidden px-4 py-5 md:table-cell">
                    <p className="text-sm text-foreground">{formatDate(user.createdAt)}</p>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex justify-end gap-3">
                      {editingRoleUserId === user.id ? (
                        <>
                          <button
                            onClick={() => handleRoleUpdate(user.id, selectedRole || user.role)}
                            className="text-sm font-medium text-green-600 underline-offset-4 hover:underline dark:text-green-400"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoleUserId(null);
                              setSelectedRole(null);
                            }}
                            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
                              ? 'cursor-not-allowed text-muted-foreground'
                              : 'text-destructive hover:underline'
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will remove all
              associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteUserId(null)}
              className="rounded px-4 py-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteUserId && handleDelete(deleteUserId)}
              className="rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
