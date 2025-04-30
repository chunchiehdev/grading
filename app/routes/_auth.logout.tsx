import { useLogout } from "@/hooks/api/auth";
import { useEffect } from "react";

export default function LogoutPage() {
  const logout = useLogout();

  useEffect(() => {
    logout.mutateAsync();
  }, [logout]);

  return null;
} 