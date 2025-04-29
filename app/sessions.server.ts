import { createCookieSessionStorage } from "react-router";

// Theme session storage (replaces ../theme-provider)
const themeSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__theme",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secrets: [process.env.THEME_SECRET || "default"],
    secure: false,
  },
});

// Helper to get theme session
export async function getThemeSession(request: Request) {
  const session = await themeSessionStorage.getSession(request.headers.get("Cookie"));
  return {
    getTheme: () => session.get("theme") || "light",
    setTheme: (theme: string) => session.set("theme", theme),
    commit: () => themeSessionStorage.commitSession(session),
  };
}

// Export the themeSessionResolver function
export const themeSessionResolver = getThemeSession;

// Auth session storage
const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__auth",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.AUTH_SECRET || "default"],
    secure: false,
  },
});

// Helper to get auth session
export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return authSessionStorage.getSession(cookie);
}

export { authSessionStorage };
