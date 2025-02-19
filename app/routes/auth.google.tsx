import { googleLogin } from "@/services/auth.server";

export async function loader() {
  return await googleLogin();
}
