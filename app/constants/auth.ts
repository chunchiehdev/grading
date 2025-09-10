export const PUBLIC_PATHS = [
  '/',                    // Landing page
  '/auth/login', 
  '/auth/register', 
  '/auth/select-role',    // Role selection page
  '/auth/google', 
  '/auth/google/callback',
  '/health',              
  '/tailwind.css',        
  '/__manifest',          
  '/api/health',          
  '/assets',              
  '/favicon.ico',         
  '/rubber-duck.ico',     
] as const;

export const AUTH_COOKIE_NAME = '__auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; 
