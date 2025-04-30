import { create } from "zustand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

export function useAuth() {
  const { user, setUser, clearUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check");
      if (!res.ok) {
        clearUser();
        throw new Error("未登入");
      }
      const data = await res.json();
      setUser(data.user);
      return data.user;
    },
    retry: false,
    refetchOnWindowFocus: false,
    initialData: user,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("登出失敗");
      return res;
    },
    onSuccess: () => {
      queryClient.clear();
      clearUser();
      window.location.href = "/auth/login";
    },
  });

  return {
    user: currentUser,
    isLoading,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
