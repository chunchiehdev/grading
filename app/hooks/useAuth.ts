import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import logger from '@/utils/logger';

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
        logger.debug('[useUser] Fetching user data');
        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          logger.error('[useUser] Failed to fetch user data:', res.status);
          return null;
        }

        const data = await res.json();

        if (data?.success && data?.data) {
          logger.debug('[useUser] Found user data in success format');
          return data.data;
        } else if (data?.user) {
          logger.debug('[useUser] Found user data in user format');
          return data.user;
        } else if (data && typeof data === 'object' && data.id) {
          logger.debug('[useUser] Found user data in object format');
          return data;
        }

        logger.warn('[useUser] User data not found in response:', data);
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
      logger.info('[useLogin] Attempting login');

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
      logger.info('[useLogin] Login successful');

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
      logger.info('[useLogout] Logging out');

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

      logger.info('[useLogout] Logout successful');
      return response.json();
    },
    onSuccess: () => {
      logger.info('[useLogout] Clearing query cache');

      queryClient.clear();

      window.location.href = '/auth/login';
    },
  });
}
