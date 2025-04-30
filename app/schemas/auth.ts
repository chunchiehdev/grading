import { z } from "zod";
import type { AuthError } from '@/types/auth';

// 登入表單模式
export const loginSchema = z.object({
  email: z
    .string({ required_error: "電子郵件是必填的" })
    .email("請輸入有效的電子郵件地址"),
  password: z
    .string({ required_error: "密碼是必填的" })
    .min(6, "密碼長度必須至少為6個字符"),
});

// 註冊表單模式
export const registerSchema = z.object({
  email: z
    .string({ required_error: "電子郵件是必填的" })
    .email("請輸入有效的電子郵件地址"),
  password: z
    .string({ required_error: "密碼是必填的" })
    .min(6, "密碼長度必須至少為6個字符"),
  confirmPassword: z
    .string({ required_error: "確認密碼是必填的" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "密碼不一致",
  path: ["confirmPassword"],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

// 將Zod錯誤轉換為AuthError格式
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  error.errors.forEach(err => {
    const path = err.path[0] as string;
    formattedErrors[path] = err.message || "Invalid value";
  });
  return formattedErrors;
}

// 重新導出類型
export type { AuthError }; 