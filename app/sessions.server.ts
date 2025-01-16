import { createThemeSessionResolver } from "remix-themes";
import { createCookieSessionStorage } from "@remix-run/node";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__theme",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secrets: [process.env.THEME_SECRET || "default"],
  },
});

const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__auth",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.AUTH_SECRET || "default"],
    secure: process.env.NODE_ENV === "production",
  },
});

const themeSessionResolver = createThemeSessionResolver(sessionStorage);

async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return authSessionStorage.getSession(cookie);
}

export { authSessionStorage, themeSessionResolver, getSession };
