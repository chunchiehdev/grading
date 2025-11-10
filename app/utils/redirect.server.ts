/**
 * Redirect utilities for handling post-authentication redirects safely
 */

/**
 * Validates that a redirect path is safe to use
 * - Must be an internal path (starts with /)
 * - Must not be an auth-related path (prevents redirect loops)
 */
export function isSafeRedirectPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Must be an internal path
  if (!path.startsWith('/')) {
    return false;
  }

  // Prevent redirect loops by excluding auth paths
  const unsafePaths = ['/auth/login', '/auth/google', '/auth/select-role', '/auth/logout'];
  if (unsafePaths.some((unsafePath) => path.startsWith(unsafePath))) {
    return false;
  }

  return true;
}

/**
 * Gets the safe redirect path from URL search params
 * Returns null if the path is unsafe or not present
 */
export function getSafeRedirectPath(request: Request): string | null {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo');
  return isSafeRedirectPath(redirectTo) ? redirectTo : null;
}
