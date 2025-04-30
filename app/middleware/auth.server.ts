import { redirect } from "react-router";
import { getUser } from "@/services/auth.server";
import { PUBLIC_PATHS } from "@/constants/auth";

export async function requireAuth(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
    return null;
  }

  const user = await getUser(request);
  if (!user) {
    const searchParams = new URLSearchParams([["redirectTo", path]]);
    throw redirect(`/auth/login?${searchParams}`);
  }

  const referer = request.headers.get("Referer");
  if (referer) {
    const refererUrl = new URL(referer);
    const currentUrl = new URL(request.url);
    if (refererUrl.origin !== currentUrl.origin) {
      throw redirect("/auth/login");
    }
  }

  return user;
} 