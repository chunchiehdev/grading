import { db } from "@/lib/db.server";
import bcrypt from "bcryptjs";
import { redirect } from "react-router";
import { getSession, authSessionStorage } from "@/sessions.server";
import { OAuth2Client } from "google-auth-library";
import type { LoginFormValues } from "@/schemas/auth";
import { ApiError } from "@/middleware/api.server";

interface LoginCredentials {
  email: string;
  password: string;
}

let oauth2Client: OAuth2Client | null = null;
console.log(
  "Using Google redirect URI:",
  process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/auth/google/callback"
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/auth/google/callback"
  );
}

/**
 * API 金鑰驗證結果
 */
export interface ApiAuthResult {
  isAuthenticated: boolean;
  apiKey?: string;
  error?: string;
  scopes?: string[];
}

/**
 * 驗證 API 請求
 * 支援 API 金鑰驗證 (Authorization: Bearer YOUR_API_KEY)
 */
export async function authenticateApiRequest(
  request: Request
): Promise<ApiAuthResult> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return { isAuthenticated: false, error: "缺少授權標頭" };
    }

    const [authType, apiKey] = authHeader.split(" ");
    if (authType.toLowerCase() !== "bearer" || !apiKey) {
      return { isAuthenticated: false, error: "無效的授權格式" };
    }

    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      return { isAuthenticated: false, error: "無效的 API 金鑰" };
    }

    const scopes = await getApiKeyScopes(apiKey);

    return {
      isAuthenticated: true,
      apiKey,
      scopes,
    };
  } catch (error) {
    console.error("API 授權錯誤:", error);
    return {
      isAuthenticated: false,
      error: error instanceof Error ? error.message : "授權處理過程中發生錯誤",
    };
  }
}

/**
 * 驗證 API 金鑰
 * 這裡應該根據實際情況實現與資料庫的整合
 */
async function validateApiKey(apiKey: string): Promise<boolean> {
  const validKeys = process.env.API_KEYS?.split(",") || [
    "test_api_key_1",
    "test_api_key_2",
  ];
  return validKeys.includes(apiKey);
}

/**
 * 獲取 API 金鑰的權限範圍
 * 這裡應該根據實際情況實現與資料庫的整合
 */
async function getApiKeyScopes(apiKey: string): Promise<string[]> {
  return ["grading:read", "grading:write"];
}

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
  if (!oauth2Client) {
    console.warn("Google OAuth credentials not configured");
    return redirect("/login?error=google-auth-unavailable");
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  console.log(url);
  return redirect(url);
}

export async function handleGoogleCallback(request: Request) {
  if (!oauth2Client) {
    console.warn("Google OAuth credentials not configured");
    return redirect("/login?error=google-auth-unavailable");
  }

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
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error("No user payload");

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

    return createUserSession(user.id, "/dashboard");
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

export async function login({ email, password }: LoginFormValues) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError("Authentication failed", 401, { email: "沒這信箱" });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new ApiError("Authentication failed", 401, { password: "密碼錯了" });
  }

  return createUserSession(user.id, "/dashboard");
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
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw await logout(request);
    }

    return user;
  } catch {
    throw await logout(request);
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
