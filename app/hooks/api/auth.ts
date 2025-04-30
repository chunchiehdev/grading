import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";

// 取得目前登入的使用者
export function useUser() {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check");
      if (!res.ok) throw new Error("未登入");
      const data = await res.json();
      setUser(data.user);
      return data.user;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// 登入
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw data;
      }
      setUser(data.data || null);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      return data.data;
    },
  });
}
