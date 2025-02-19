// routes/_auth.login.tsx
import {
  type ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useNavigation, Link, Navigate, useNavigate } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { login, getUser } from "@/services/auth.server";
import type { AuthError } from "@/types/auth";
import { useState } from "react";
import { cn } from "@/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (user) {
    return redirect("/");
  }
  return null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json(
      { errors: { general: "無效的表單提交" } },
      { status: 400 }
    );
  }

  return await login({ email, password });
};

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navitgate = useNavigate()
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors as AuthError;
  const [touched, setTouched] = useState({ email: false, password: false });

  
  const handleInputFocus = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/auth/google"
        className="inline-flex items-center justify-center w-full gap-2 h-11 rounded-xl px-5 font-medium bg-background hover:bg-white dark:bg-secondary dark:hover:bg-secondary/80 border border-border hover:border-gray-300 transition-all"
        
      >
        <img src="/google.svg" alt="" className="w-4 h-4" />
        使用 Google 登入
      </Link>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-xs text-muted-foreground bg-background">
            或是
          </span>
        </div>
      </div>

      <Form method="post" className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            {errors?.email && touched.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>
          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={cn(
                "pl-9 h-11 transition-all bg-background/50 hover:bg-background focus:bg-background rounded-xl",
                errors?.email && touched.email
                  ? "border-destructive/50 hover:border-destructive focus:border-destructive"
                  : "border-input/60 hover:border-input focus:border-input"
              )}
              placeholder="電子郵件地址"
              onFocus={() => handleInputFocus("email")}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            {errors?.password && touched.password && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={cn(
                "pl-9 h-11 transition-all bg-background/50 hover:bg-background focus:bg-background rounded-xl",
                errors?.password && touched.password
                  ? "border-destructive/50 hover:border-destructive focus:border-destructive"
                  : "border-input/60 hover:border-input focus:border-input"
              )}
              placeholder="密碼"
              onFocus={() => handleInputFocus("password")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            忘記密碼？
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-11 transition-all bg-primary hover:bg-primary/90 rounded-xl",
            "bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-[length:200%_100%] hover:bg-right",
            isSubmitting && "opacity-90"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>登入中...</span>
            </div>
          ) : (
            "使用電子郵件繼續"
          )}
        </Button>
      </Form>

      <div className="text-xs text-muted-foreground leading-relaxed tracking-tight">
        繼續代表您同意我們的
        <a href="#" className="underline hover:text-foreground ml-1">
          服務條款
        </a>
        、
        <a href="#" className="underline hover:text-foreground ml-1">
          隱私權政策
        </a>
      </div>
    </div>
  );
}
