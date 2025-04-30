import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";

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

export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      // Clear local storage
      localStorage.clear();
      // Clear auth store
      clearUser();
      // Redirect to login
      window.location.href = "/auth/login";
    },
  });
}
