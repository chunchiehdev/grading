export const PUBLIC_PATHS = [
  '/', // Landing page
  '/auth/login',
  '/auth/register',
  '/auth/select-role', // Role selection page
  '/auth/google',
  '/auth/google/callback',
  '/auth/test-login', // Test login route
  '/health',
  '/tailwind.css',
  '/__manifest',
  '/api/health',
  '/assets',
  '/favicon.ico',
  '/rubber-duck.ico',
] as const;

// Protected routes that need full-width layout (no padding wrapper)
export const FULL_WIDTH_PROTECTED_PATHS = [
  '/agent-playground', // AI Agent playground - requires auth but uses full-width layout
] as const;

export const AUTH_COOKIE_NAME = '__auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
