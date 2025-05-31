import { db } from '@/lib/db.server';
import { redirect } from 'react-router';
import { getSession, commitSession, destroySession } from '@/sessions.server';
import { OAuth2Client } from 'google-auth-library';

let oauth2Client: OAuth2Client | null = null;

console.log(
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
    console.warn('Google OAuth credentials not configured');
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
 * @returns {Promise<Response>} Redirect response to dashboard or login with error
 * @throws {Error} If authorization code is missing or invalid
 */
export async function handleGoogleCallback(request: Request) {
  if (!oauth2Client) {
    console.warn('Google OAuth credentials not configured');
    return redirect('/login?error=google-auth-unavailable');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  console.log('🔍 Google callback - URL:', url.toString());
  console.log('🔍 Google callback - Code present:', !!code);

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
    if (!payload || !payload.email) throw new Error('No user payload');

    console.log('✅ Google auth successful for:', payload.email);

    let user = await db.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      console.log('📝 Creating new user:', payload.email);
      user = await db.user.create({
        data: {
          email: payload.email,
        },
      });
    }

    console.log('🍪 Creating session for user:', user.id);
    const session = await createUserSession(user.id, request);
    const response = redirect('/dashboard');
    response.headers.set('Set-Cookie', session);

    console.log('🔄 Redirecting to dashboard with session cookie');
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

  console.log('👤 getUser - userId from session:', userId);

  if (!userId || typeof userId !== 'string') {
    console.log('❌ getUser - No valid userId in session');
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    console.log('👤 getUser - Found user in DB:', user ? user.email : 'null');

    if (!user) {
      console.log('❌ getUser - User not found in database with id:', userId);
      return null;
    }

    return user;
  } catch (error) {
    console.error('❌ getUser - Database error:', error);
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
  return destroySession(session);
}
