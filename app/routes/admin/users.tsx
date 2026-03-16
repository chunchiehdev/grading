import { useEffect, useMemo, useState } from 'react';
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from 'react-router';
import type { Route } from './+types/users';
import { requireAdmin, updateUserRoleAsAdmin } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatDateTimeInTimeZone } from '@/lib/date';
import logger from '@/utils/logger';

type SortField = 'createdAt' | 'name' | 'role';
type SortOrder = 'asc' | 'desc';
type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  picture: string;
  createdAt: string;
  hasSelectedRole: boolean;
  aiEnabled: boolean;
}

interface UserStats {
  total: number;
  students: number;
  teachers: number;
  admins: number;
}

interface LoaderData {
  users: User[];
  stats: UserStats;
  currentUserId: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

type ActionData =
  | {
      success: true;
      intent: 'update-role' | 'toggle-ai' | 'delete';
      userId: string;
      role?: UserRole;
      aiEnabled?: boolean;
      message: string;
    }
  | {
      success: false;
      intent: 'update-role' | 'toggle-ai' | 'delete' | 'unknown';
      userId?: string;
      error: string;
    };

function parseSortField(value: string | null): SortField {
  if (value === 'name' || value === 'role' || value === 'createdAt') {
    return value;
  }
  return 'createdAt';
}

function parseSortOrder(value: string | null): SortOrder {
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  return 'desc';
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const admin = await requireAdmin(request);

  const url = new URL(request.url);
  const sortBy = parseSortField(url.searchParams.get('sortBy'));
  const sortOrder = parseSortOrder(url.searchParams.get('order'));

  const orderBy =
    sortBy === 'name' ? { name: sortOrder } : sortBy === 'role' ? { role: sortOrder } : { createdAt: sortOrder };

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      picture: true,
      createdAt: true,
      hasSelectedRole: true,
      aiEnabled: true,
    },
    orderBy,
  });

  const stats = users.reduce<UserStats>(
    (acc, user) => {
      acc.total += 1;
      if (user.role === 'STUDENT') acc.students += 1;
      if (user.role === 'TEACHER') acc.teachers += 1;
      if (user.role === 'ADMIN') acc.admins += 1;
      return acc;
    },
    { total: 0, students: 0, teachers: 0, admins: 0 }
  );

  return {
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
    stats,
    currentUserId: admin.id,
    sortBy,
    sortOrder,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const admin = await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get('intent');
  const userId = formData.get('userId');

  if (typeof userId !== 'string' || userId.length === 0) {
    return Response.json(
      {
        success: false,
        intent: 'unknown',
        error: 'User ID is required',
      },
      { status: 400 }
    );
  }

  if (intent === 'toggle-ai') {
    const aiEnabledRaw = formData.get('aiEnabled');

    if (aiEnabledRaw !== 'true' && aiEnabledRaw !== 'false') {
      return Response.json(
        {
          success: false,
          intent: 'toggle-ai',
          userId,
          error: 'Invalid aiEnabled value',
        },
        { status: 400 }
      );
    }

    try {
      const target = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!target) {
        return Response.json(
          {
            success: false,
            intent: 'toggle-ai',
            userId,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      if (target.role === 'ADMIN') {
        return Response.json(
          {
            success: false,
            intent: 'toggle-ai',
            userId,
            error: 'AI access for admin users is always enabled',
          },
          { status: 400 }
        );
      }

      const aiEnabled = aiEnabledRaw === 'true';

      await db.user.update({
        where: { id: userId },
        data: { aiEnabled },
      });

      return Response.json({
        success: true,
        intent: 'toggle-ai',
        userId,
        aiEnabled,
        message: aiEnabled ? 'AI 功能已啟用' : 'AI 功能已停用',
      });
    } catch (error) {
      logger.error({ error, userId, adminId: admin.id }, 'Failed to toggle AI access');
      return Response.json(
        {
          success: false,
          intent: 'toggle-ai',
          userId,
          error: 'Failed to update AI access',
        },
        { status: 500 }
      );
    }
  }

  if (intent === 'update-role') {
    const role = formData.get('role');

    if (role !== 'STUDENT' && role !== 'TEACHER' && role !== 'ADMIN') {
      return Response.json(
        {
          success: false,
          intent: 'update-role',
          userId,
          error: 'Invalid role',
        },
        { status: 400 }
      );
    }

    if (userId === admin.id) {
      return Response.json(
        {
          success: false,
          intent: 'update-role',
          userId,
          error: 'Cannot change your own role',
        },
        { status: 403 }
      );
    }

    try {
      await updateUserRoleAsAdmin(userId, role);

      return Response.json({
        success: true,
        intent: 'update-role',
        userId,
        role,
        message: `Role updated to ${role}`,
      });
    } catch (error) {
      logger.error({ error, userId, role, adminId: admin.id }, 'Failed to update user role');
      return Response.json(
        {
          success: false,
          intent: 'update-role',
          userId,
          error: 'Failed to update role',
        },
        { status: 500 }
      );
    }
  }

  if (intent === 'delete') {
    if (userId === admin.id) {
      return Response.json(
        {
          success: false,
          intent: 'delete',
          userId,
          error: 'Cannot delete your own account',
        },
        { status: 403 }
      );
    }

    try {
      const target = await db.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!target) {
        return Response.json(
          {
            success: false,
            intent: 'delete',
            userId,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      await db.user.delete({ where: { id: userId } });

      return Response.json({
        success: true,
        intent: 'delete',
        userId,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error({ error, userId, adminId: admin.id }, 'Failed to delete user');
      return Response.json(
        {
          success: false,
          intent: 'delete',
          userId,
          error: 'Failed to delete user',
        },
        { status: 500 }
      );
    }
  }

  return Response.json(
    {
      success: false,
      intent: 'unknown',
      error: 'Invalid action',
    },
    { status: 400 }
  );
}

export default function AdminUsersPage() {
  const { t } = useTranslation('common');
  const { users, stats, currentUserId, sortBy, sortOrder } = useLoaderData<typeof loader>();

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [optimisticAI, setOptimisticAI] = useState<Record<string, boolean>>({});

  const mutationFetcher = useFetcher<ActionData>();
  const navigate = useNavigate();
  const navigation = useNavigation();

  const pendingUserId = mutationFetcher.formData?.get('userId');

  const isSorting =
    navigation.state !== 'idle' &&
    navigation.location?.pathname === '/admin/users' &&
    navigation.location.search !== `?${new URLSearchParams({ sortBy, order: sortOrder }).toString()}`;

  useEffect(() => {
    if (!mutationFetcher.data || mutationFetcher.state !== 'idle') return;

    if (mutationFetcher.data.success) {
      toast.success(mutationFetcher.data.message);

      if (mutationFetcher.data.intent === 'update-role') {
        setEditingRoleUserId(null);
        setSelectedRole(null);
      }

      if (mutationFetcher.data.intent === 'delete') {
        setDeleteUserId(null);
      }
    } else {
      toast.error(mutationFetcher.data.error || t('adminUsers.toasts.updateFailed'));
    }

    if (mutationFetcher.data.intent === 'toggle-ai' && mutationFetcher.data.userId) {
      const targetUserId = mutationFetcher.data.userId;
      setOptimisticAI((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
    }
  }, [mutationFetcher.data, mutationFetcher.state, t]);

  const updateSort = (nextSortBy: SortField, nextSortOrder: SortOrder) => {
    const params = new URLSearchParams();
    params.set('sortBy', nextSortBy);
    params.set('order', nextSortOrder);
    navigate(`/admin/users?${params.toString()}`, { replace: true, preventScrollReset: true });
  };

  const handleSort = (field: SortField) => {
    const nextOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    updateSort(field, nextOrder);
  };

  const handleDelete = (userId: string) => {
    mutationFetcher.submit(
      {
        intent: 'delete',
        userId,
      },
      { method: 'post' }
    );
  };

  const handleRoleUpdate = (userId: string, role: UserRole) => {
    mutationFetcher.submit(
      {
        intent: 'update-role',
        userId,
        role,
      },
      { method: 'post' }
    );
  };

  const handleAIToggle = (userId: string, aiEnabled: boolean) => {
    setOptimisticAI((prev) => ({ ...prev, [userId]: aiEnabled }));

    mutationFetcher.submit(
      {
        intent: 'toggle-ai',
        userId,
        aiEnabled: String(aiEnabled),
      },
      { method: 'post' }
    );
  };

  const formatDate = (dateString: string) => {
    return formatDateTimeInTimeZone(dateString);
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">↕</span>;
    return <span className="ml-1 text-xs text-[#D2691E] dark:text-[#E87D3E]">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const usersWithOptimisticAI = useMemo(() => {
    return users.map((user) => ({
      ...user,
      aiEnabled: optimisticAI[user.id] ?? user.aiEnabled,
    }));
  }, [optimisticAI, users]);

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100 sm:text-4xl">
            User Management
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Manage all system users and roles</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          <div className="border-2 border-[#2B2B2B] p-6 dark:border-gray-200">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.total}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Students</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.students}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Teachers</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.teachers}</p>
          </div>
          <div className="border-2 border-[#2B2B2B] p-6 transition-colors hover:border-[#D2691E] dark:border-gray-200 dark:hover:border-[#E87D3E]">
            <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Admins</p>
            <p className="mt-3 font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">{stats.admins}</p>
          </div>
        </div>

        {isSorting && <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">Refreshing users...</div>}

        <div className="mb-6 grid grid-cols-2 gap-3 md:hidden">
          <Select value={sortBy} onValueChange={(value) => updateSort(value as SortField, sortOrder)}>
            <SelectTrigger className="border-2 border-[#2B2B2B]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Registered</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(value) => updateSort(sortBy, value as SortOrder)}>
            <SelectTrigger className="border-2 border-[#2B2B2B]">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 md:hidden">
          {usersWithOptimisticAI.map((user) => {
            const isPendingForUser = mutationFetcher.state !== 'idle' && pendingUserId === user.id;

            return (
              <article key={user.id} className="border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
                <div className="flex items-start gap-3">
                  <Avatar className="border-2 border-[#2B2B2B] dark:border-gray-200">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-transparent font-serif text-[#2B2B2B] dark:text-gray-200">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                      {user.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Registered: {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-[#2B2B2B] pt-3 dark:border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Role
                    </span>
                    {editingRoleUserId === user.id ? (
                      <Select
                        value={selectedRole || user.role}
                        onValueChange={(value) => setSelectedRole(value as UserRole)}
                      >
                        <SelectTrigger className="h-11 w-36 border-2 border-[#2B2B2B] dark:border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="TEACHER">Teacher</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        type="button"
                        disabled={user.id === currentUserId || isPendingForUser}
                        className={`min-h-[44px] border-2 px-3 text-xs font-medium uppercase tracking-wider transition-all ${
                          user.id === currentUserId
                            ? 'cursor-not-allowed border-[#2B2B2B] text-[#2B2B2B]/40 dark:border-gray-200 dark:text-gray-200/40'
                            : 'cursor-pointer border-[#2B2B2B] text-[#2B2B2B] hover:border-[#D2691E] hover:bg-[#D2691E]/5 hover:text-[#D2691E] dark:border-gray-200 dark:text-gray-200 dark:hover:border-[#E87D3E] dark:hover:bg-[#E87D3E]/10 dark:hover:text-[#E87D3E]'
                        }`}
                        onClick={() => {
                          setEditingRoleUserId(user.id);
                          setSelectedRole(user.role);
                        }}
                      >
                        {user.role}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      AI Access
                    </span>
                    {user.role === 'ADMIN' ? (
                      <span className="text-sm text-gray-500 dark:text-gray-500">Always enabled</span>
                    ) : (
                      <Switch
                        checked={user.aiEnabled}
                        disabled={isPendingForUser}
                        onCheckedChange={(checked) => handleAIToggle(user.id, checked)}
                        className="data-[state=checked]:bg-[#D2691E] dark:data-[state=checked]:bg-[#E87D3E]"
                      />
                    )}
                  </div>

                  {editingRoleUserId === user.id ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isPendingForUser}
                        onClick={() => handleRoleUpdate(user.id, selectedRole || user.role)}
                        className="min-h-[44px] flex-1 border-2 border-[#2B2B2B] px-4 text-sm font-medium text-[#2B2B2B] hover:border-[#D2691E] hover:text-[#D2691E] disabled:opacity-50 dark:border-gray-200 dark:text-gray-200 dark:hover:border-[#E87D3E] dark:hover:text-[#E87D3E]"
                      >
                        Save Role
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoleUserId(null);
                          setSelectedRole(null);
                        }}
                        className="min-h-[44px] flex-1 border-2 border-gray-400 px-4 text-sm font-medium text-gray-600 hover:border-[#2B2B2B] hover:text-[#2B2B2B] dark:border-gray-500 dark:text-gray-300 dark:hover:border-gray-200 dark:hover:text-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteUserId(user.id)}
                      disabled={user.id === currentUserId || isPendingForUser}
                      className={`min-h-[44px] w-full border-2 px-4 text-sm font-medium transition-colors ${
                        user.id === currentUserId
                          ? 'cursor-not-allowed border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-600'
                          : 'border-[#D2691E] text-[#D2691E] hover:bg-[#D2691E]/10 dark:border-[#E87D3E] dark:text-[#E87D3E] dark:hover:bg-[#E87D3E]/10'
                      }`}
                    >
                      {user.id === currentUserId ? 'Current user' : 'Delete user'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
                <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  AI
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usersWithOptimisticAI.map((user, index) => {
                const isPendingForUser = mutationFetcher.state !== 'idle' && pendingUserId === user.id;
                return (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-[#D2691E]/5 dark:hover:bg-[#E87D3E]/10 ${
                      index === usersWithOptimisticAI.length - 1 ? '' : 'border-b border-[#2B2B2B] dark:border-gray-200'
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
                          onValueChange={(value) => setSelectedRole(value as UserRole)}
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
                        <button
                          type="button"
                          disabled={user.id === currentUserId || isPendingForUser}
                          className={`inline-block border-2 border-[#2B2B2B] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#2B2B2B] transition-all disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-200 dark:text-gray-200 ${
                            user.id === currentUserId
                              ? ''
                              : 'cursor-pointer hover:border-[#D2691E] hover:bg-[#D2691E]/5 hover:text-[#D2691E] dark:hover:border-[#E87D3E] dark:hover:bg-[#E87D3E]/10 dark:hover:text-[#E87D3E]'
                          }`}
                          onClick={() => {
                            setEditingRoleUserId(user.id);
                            setSelectedRole(user.role);
                          }}
                        >
                          {user.role}
                        </button>
                      )}
                    </td>
                    <td className="hidden px-4 py-5 md:table-cell">
                      <p className="font-serif text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      {user.role === 'ADMIN' ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Always</span>
                      ) : (
                        <Switch
                          checked={user.aiEnabled}
                          disabled={isPendingForUser}
                          onCheckedChange={(checked) => handleAIToggle(user.id, checked)}
                          className="data-[state=checked]:bg-[#D2691E] dark:data-[state=checked]:bg-[#E87D3E]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex justify-end gap-4">
                        {editingRoleUserId === user.id ? (
                          <>
                            <button
                              type="button"
                              disabled={isPendingForUser}
                              onClick={() => handleRoleUpdate(user.id, selectedRole || user.role)}
                              className="text-sm font-medium text-[#2B2B2B] underline-offset-4 hover:text-[#D2691E] hover:underline disabled:opacity-50 dark:text-gray-200 dark:hover:text-[#E87D3E]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
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
                            type="button"
                            onClick={() => setDeleteUserId(user.id)}
                            disabled={user.id === currentUserId || isPendingForUser}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent className="border-2 border-[#2B2B2B] dark:border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this user? This action cannot be undone and will remove all associated
              data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <button
              type="button"
              onClick={() => setDeleteUserId(null)}
              className="border-2 border-[#2B2B2B] px-6 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!deleteUserId}
              onClick={() => {
                if (deleteUserId) {
                  handleDelete(deleteUserId);
                }
              }}
              className="border-2 border-[#D2691E] bg-[#D2691E] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#D2691E]/90 disabled:opacity-50 dark:border-[#E87D3E] dark:bg-[#E87D3E]"
            >
              Delete User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
