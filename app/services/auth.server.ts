// services/auth.server.ts
import { db } from "@/lib/db.server";
import bcrypt from "bcryptjs";
import { redirect } from "@remix-run/node";
import { getSession, authSessionStorage } from "@/sessions.server";

interface LoginCredentials {
  email: string;
  password: string;
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
