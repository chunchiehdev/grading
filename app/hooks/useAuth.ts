import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

/**
 * Use React Query to fetch user data
 * focus on the user data structure
 */
export function useUser() {
  return useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        console.log('[useUser] Fetching user data...');

        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          console.log('[useUser] User not authenticated:', res.status);
          return null;
        }

        const data = await res.json();

        if (data?.success && data?.data) {
          console.log('[useUser] Found user data in success/data format');
          return data.data;
        } else if (data?.user) {
          console.log('[useUser] Found user data in user format');
          return data.user;
        } else if (data && typeof data === 'object' && data.id) {
          console.log('[useUser] Found user data in direct format');
          return data;
        }

        console.log('[useUser] No valid user data found');
        return null;
      } catch (error) {
        console.error('[useUser] Error fetching user data:', error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: true,
    staleTime: 60000,
  });
}

/**
 * use React Query to login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      console.log('[useLogin] Attempting login');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('[useLogin] Login failed:', data);
        throw data;
      }

      const userData = data.data || data.user || null;
      console.log('[useLogin] Login successful');

      await queryClient.invalidateQueries({ queryKey: ['user'] });

      return userData;
    },
  });
}

/**
 * use React Query to logout 
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[useLogout] Logging out');

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[useLogout] Logout failed:', response.status);
        throw new Error('Logout failed');
      }

      console.log('[useLogout] Logout successful');
      return response.json();
    },
    onSuccess: () => {
      console.log('[useLogout] Clearing query cache');

      queryClient.clear();

      window.location.href = '/auth/login';
    },
  });
}
