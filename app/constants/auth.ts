export const PUBLIC_PATHS = [
  '/',                    // Landing page
  '/auth/login', 
  '/auth/register', 
  '/auth/google', 
  '/auth/google/callback',
  '/health',              // Health check
  '/tailwind.css',        // CSS file
  '/__manifest',          // React Router manifest
  '/api/health',          // API health check
  '/assets',              // Static assets
  '/favicon.ico',         // Favicon
  '/rubber-duck.ico',     // Your icon
] as const;

export const AUTH_COOKIE_NAME = '__auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; 
