import { db } from '@/lib/db.server';
import bcrypt from 'bcryptjs';
import { redirect } from 'react-router';
import { getSession, commitSession, destroySession } from '@/sessions.server';
import { OAuth2Client } from 'google-auth-library';
import type { LoginFormValues } from '@/schemas/auth';
import { ApiError } from '@/middleware/api.server';

interface LoginCredentials {
  email: string;
  password: string;
}

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

    let user = await db.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: payload.email,
          password: await bcrypt.hash(Math.random().toString(36), 10),
        },
      });
    }

    const session = await createUserSession(user.id);
    const response = redirect('/dashboard');
    response.headers.set('Set-Cookie', session);

    return response;
  } catch (error) {
    console.error('Google authentication error:', error);
    return redirect('/login?error=google-auth-failed');
  }
}

/**
 * Registers a new user with email and password
 * @param {LoginCredentials} credentials - User email and password
 * @param {string} credentials.email - User email address
 * @param {string} credentials.password - User password
 * @returns {Promise<Response>} Redirect response to dashboard with session
 * @throws {ApiError} If user already exists
 */
export async function register({ email, password }: LoginCredentials) {
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new ApiError('Registration failed', 400, {
      email: 'A user already exists with this email',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  const session = await createUserSession(user.id);
  const response = redirect('/dashboard');
  response.headers.set('Set-Cookie', session);

  return response;
}

/**
 * Authenticates user login with email and password
 * @param {LoginFormValues} credentials - User login credentials
 * @param {string} credentials.email - User email address
 * @param {string} credentials.password - User password
 * @returns {Promise<Response>} Redirect response to dashboard with session
 * @throws {ApiError} If credentials are invalid
 */
export async function login({ email, password }: LoginFormValues) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError('Authentication failed', 401, { email: 'Invalid email' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new ApiError('Authentication failed', 401, { password: 'Invalid password' });
  }

  const session = await createUserSession(user.id);
  const response = redirect('/dashboard');
  response.headers.set('Set-Cookie', session);
  return response;
}

/**
 * Creates a new user session and returns session cookie
 * @param {string} userId - The user ID to create session for
 * @returns {Promise<string>} Session cookie string for Set-Cookie header
 */
export async function createUserSession(userId: string) {
  const session = await getSession(new Request('http://localhost'));
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
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return null;
    }

    return user;
  } catch {
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
