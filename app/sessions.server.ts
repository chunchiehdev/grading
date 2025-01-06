import { createThemeSessionResolver } from "remix-themes";
import { createCookieSessionStorage } from "@remix-run/node";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__theme",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secrets: [process.env.COOKIE_SECRET || 'default'],
  },
});

export const themeSessionResolver = createThemeSessionResolver(sessionStorage);
