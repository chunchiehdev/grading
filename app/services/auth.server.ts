// services/auth.server.ts
import { db } from "@/lib/db.server";
import bcrypt from "bcryptjs";
import { redirect } from "@remix-run/node";
import { getSession, authSessionStorage } from "@/sessions.server";
import { OAuth2Client } from "google-auth-library";

interface LoginCredentials {
  email: string;
  password: string;
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials not configured");
}

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback"
);

export async function getUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function googleLogin() {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  })
  console.log(url)
  return redirect(url)
}

export async function handleGoogleCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw new Error("Missing authorization code");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error("No user payload");

    
    let user = await db.user.findUnique({
      where: { email: payload.email }
    });

    
    if (!user) {
      user = await db.user.create({
        data: {
          email: payload.email,    
          password: await bcrypt.hash(Math.random().toString(36), 10),
        }
      });
    }

    return createUserSession(user.id, "/");
  } catch (error) {
    console.error("Google authentication error:", error);
    return redirect("/login?error=google-auth-failed");
  }
}

export async function register({ email, password }: LoginCredentials) {
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return Response.json(
      { errors: { email: "A user already exists with this email" } },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return createUserSession(user.id, "/");
}

export async function login({ email, password }: LoginCredentials) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json(
      { errors: { email: "沒這信箱" } },
      { status: 400 }
    );
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return Response.json(
      { errors: { password: "密碼錯了" } },
      { status: 400 }
    );
  }

  return createUserSession(user.id, "/");
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await authSessionStorage.getSession();

  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await authSessionStorage.commitSession(session),
    },
  });
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    return await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await authSessionStorage.destroySession(session),
    },
  });
}
