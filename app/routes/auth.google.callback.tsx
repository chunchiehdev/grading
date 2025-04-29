import { handleGoogleCallback } from "@/services/auth.server";

export async function loader({ request }: { request: Request }) {
  return await handleGoogleCallback(request);
}