import type { LoaderFunctionArgs } from "@remix-run/node";
import { handleGoogleCallback } from "@/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return await handleGoogleCallback(request);
}

