/**
 * Authentication Hooks - Now simplified for SSR architecture
 *
 * Previous hooks (useUser, useLogout) have been removed in favor of:
 * - Server-side rendering with useLoaderData() for user data
 * - Direct API calls for logout functionality
 *
 * Example usage:
 * // Get user data from SSR
 * const { user } = useLoaderData() as { user: User | null };
 *
 * // Logout functionality
 * const handleLogout = async () => {
 *   const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
 *   if (response.ok) window.location.href = '/?logout=success';
 * };
 */

/**
 * User interface definition for authentication
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} email - User email address
 * @property {string} [name] - Optional user display name
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'TEACHER' | 'STUDENT' | null;
  picture?: string;
  [key: string]: any;
}
