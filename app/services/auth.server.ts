import { db } from '@/lib/db.server';
import { redirect } from 'react-router';
import { getSession, commitSession, destroySession } from '@/sessions.server';
import { OAuth2Client } from 'google-auth-library';
import logger from '@/utils/logger';

let oauth2Client: OAuth2Client | null = null;

logger.info(
  'Using Google redirect URI:',
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  );
}

/**
 * Extracts user ID from session in the request
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<string|null>} The user ID if found, null otherwise
 */
export async function getUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get('userId');
  if (!userId || typeof userId !== 'string') return null;
  return userId;
}

/**
 * Initiates Google OAuth login flow
 * @returns {Promise<Response>} Redirect response to Google OAuth URL
 * @throws {Response} Redirect to login with error if OAuth not configured
 */
export async function googleLogin() {
  if (!oauth2Client) {
    logger.warn('Google OAuth credentials not configured');
    return redirect('/auth/login?error=google-auth-unavailable');
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
  });

  return redirect(url);
}

/**
 * Handles Google OAuth callback and creates user session
 * @param {Request} request - The callback request from Google OAuth
 * @returns {Promise<Response>} Redirect response to role selection, appropriate platform, or login with error
 * @throws {Error} If authorization code is missing or invalid
 */
export async function handleGoogleCallback(request: Request) {
  if (!oauth2Client) {
    console.warn('Google OAuth credentials not configured');
    return redirect('/login?error=google-auth-unavailable');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  console.error('🔍 Google callback - URL:', url.toString());
  console.error('🔍 Google callback - Code present:', !!code);

  if (!code) {
    throw new Error('Missing authorization code');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name || !payload.picture) throw new Error('No user payload');

    let user = await db.user.findUnique({
      where: { email: payload.email },
    });

    const isFirstTimeUser = !user;

    if (!user) {
      console.error('📝 Creating new user:', payload.email);
      user = await db.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        },
      });
    }

    console.error('🍪 Creating session for user:', user.id);
    const session = await createUserSession(user.id, request);

    let redirectPath;
    if (!user.hasSelectedRole) {
      // User hasn't selected a role yet (either new user or upgrading from old system)
      redirectPath = '/auth/select-role';
    } else {
      // User has selected a role - redirect based on their role
      redirectPath = user.role === 'TEACHER' ? '/teacher' : '/student';
    }

    const response = redirect(redirectPath);
    response.headers.set('Set-Cookie', session);

    console.error('🔄 Redirecting to:', redirectPath);
    return response;
  } catch (error) {
    console.error('❌ Google authentication error:', error);
    return redirect('/login?error=google-auth-failed');
  }
}

/**
 * Creates a new user session and returns session cookie
 * @param {string} userId - The user ID to create session for
 * @param {Request} request - The original request to maintain session continuity
 * @returns {Promise<string>} Session cookie string for Set-Cookie header
 */
export async function createUserSession(userId: string, request: Request) {
  const session = await getSession(request);
  session.set('userId', userId);
  return commitSession(session);
}

/**
 * Retrieves user data from session in request
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<Object|null>} User object with id and email, or null if not found
 */
export async function getUser(request: Request) {
  const session = await getSession(request);
  const userId = session.get('userId');

  if (!userId || typeof userId !== 'string') {
    logger.debug('getUser - No valid userId in session');
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true, picture: true, hasSelectedRole: true },
    });

    if (!user) {
      logger.warn('getUser - User not found in database with id:', userId);
      return null;
    }

    return user;
  } catch (error) {
    logger.error('getUser - Database error:', error);
    return null;
  }
}

/**
 * Logs out user by destroying their session
 * @param {Request} request - The HTTP request with session to destroy
 * @returns {Promise<string>} Session destruction cookie for Set-Cookie header
 */
export async function logout(request: Request) {
  const session = await getSession(request);
  const userId = session.get('userId');

  logger.info('🗑️ logout - Destroying session for userId:', userId);

  return destroySession(session);
}

/**
 * Updates user role after role selection
 * @param {string} userId - The user ID to update
 * @param {string} role - The selected role ('TEACHER' or 'STUDENT')
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUserRole(userId: string, role: 'TEACHER' | 'STUDENT') {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data: {
        role,
        hasSelectedRole: true, // Mark that user has explicitly selected a role
      },
      select: { id: true, email: true, role: true, hasSelectedRole: true },
    });

    console.error('👤 Updated user role:', user.email, 'to', role, '(hasSelectedRole:', user.hasSelectedRole, ')');
    return user;
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    throw error;
  }
}

/**
 * Requires user to be authenticated and returns user with role info
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<Object>} User object with role information
 * @throws {Response} Redirect to login if not authenticated
 */
export async function requireAuth(request: Request) {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  return user;
}

/**
 * Requires user to be authenticated for API routes (returns null instead of redirect)
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<Object|null>} User object with role information, or null if not authenticated
 */
export async function requireAuthForApi(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return null;
  }
  return user;
}

/**
 * Requires user to be a teacher
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<Object>} Teacher user object
 * @throws {Response} Redirect to login or unauthorized if not a teacher
 */
export async function requireTeacher(request: Request) {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  if (user.role !== 'TEACHER') {
    throw redirect('/auth/unauthorized');
  }
  return user;
}

/**
 * Requires user to be a student
 * @param {Request} request - The HTTP request with session data
 * @returns {Promise<Object>} Student user object
 * @throws {Response} Redirect to login or unauthorized if not a student
 */
export async function requireStudent(request: Request) {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  if (user.role !== 'STUDENT') {
    throw redirect('/auth/unauthorized');
  }
  return user;
}
