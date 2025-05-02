import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

/**
 * Use React Query 獲取當前登入用戶信息
 * 專注於獲取、緩存和同步伺服器數據
 */
export function useUser() {
  return useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        console.log("[useUser] Fetching user data...");
        
        const res = await fetch("/api/auth/check", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
          }
        });
        
        if (!res.ok) {
          console.log("[useUser] User not authenticated:", res.status);
          return null;
        }
        
        const data = await res.json();
        

        if (data?.success && data?.data) {
          console.log("[useUser] Found user data in success/data format");
          return data.data;
        } else if (data?.user) {
          console.log("[useUser] Found user data in user format");
          return data.user;
        } else if (data && typeof data === "object" && data.id) {
          console.log("[useUser] Found user data in direct format");
          return data;
        }
        
        console.log("[useUser] No valid user data found");
        return null;
      } catch (error) {
        console.error("[useUser] Error fetching user data:", error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: true,
    staleTime: 60000, 
  });
}

/**
 * 使用 React Query 執行登入操作
 */
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      console.log("[useLogin] Attempting login");
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        console.error("[useLogin] Login failed:", data);
        throw data;
      }
      
      const userData = data.data || data.user || null;
      console.log("[useLogin] Login successful");
      
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      
      return userData;
    },
    
  });
}

/**
 * 使用 React Query 執行登出操作
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log("[useLogout] Logging out");
      
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        console.error("[useLogout] Logout failed:", response.status);
        throw new Error("Logout failed");
      }

      console.log("[useLogout] Logout successful");
      return response.json();
    },
    onSuccess: () => {
      console.log("[useLogout] Clearing query cache");
      
      queryClient.clear();
      
      window.location.href = "/auth/login";
    },
  });
}
