import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogin } from "@/hooks/api/auth";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const login = useLogin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const error = searchParams.get("error");
  const googleError = error === "google-auth-unavailable" 
    ? "Google 登入服務暫時無法使用"
    : error === "google-auth-failed"
    ? "Google 登入失敗，請稍後再試"
    : null;

  const handleInputFocus = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      await login.mutateAsync(form);
    } catch (err: any) {
      setFieldErrors(err.errors || { general: err.error || "登入失敗" });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {googleError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {googleError}
        </div>
      )}
      {fieldErrors.general && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {fieldErrors.general}
        </div>
      )}
      <Button
        variant="outline"
        className="inline-flex items-center justify-center w-full gap-2 h-11 rounded-xl px-5 font-medium bg-background hover:bg-white dark:bg-secondary dark:hover:bg-secondary/80 border border-border hover:border-gray-300 transition-all"
        onClick={() => navigate("/auth/google")}
        disabled={login.isPending}
      >
        <img src="/google.svg" alt="" className="w-4 h-4" />
        使用 Google 登入
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-xs text-muted-foreground bg-background">
            或是
          </span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="space-y-2">
          {fieldErrors.email && touched.email && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <span>{fieldErrors.email}</span>
            </p>
          )}
          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className={cn(
                "pl-9 h-11 transition-all bg-background/50 hover:bg-background focus:bg-background rounded-xl",
                fieldErrors.email && touched.email
                  ? "border-destructive/50 hover:border-destructive focus:border-destructive"
                  : "border-input/60 hover:border-input focus:border-input"
              )}
              placeholder="電子郵件地址"
              onFocus={() => handleInputFocus("email")}
              disabled={login.isPending}
            />
          </div>
        </div>
        {/* Password Field */}
        <div className="space-y-2">
          {fieldErrors.password && touched.password && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <span>{fieldErrors.password}</span>
            </p>
          )}
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className={cn(
                "pl-9 h-11 transition-all bg-background/50 hover:bg-background focus:bg-background rounded-xl",
                fieldErrors.password && touched.password
                  ? "border-destructive/50 hover:border-destructive focus:border-destructive"
                  : "border-input/60 hover:border-input focus:border-input"
              )}
              placeholder="密碼"
              onFocus={() => handleInputFocus("password")}
              disabled={login.isPending}
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
          disabled={login.isPending}
          className={cn(
            "w-full h-11 transition-all bg-primary hover:bg-primary/90 rounded-xl",
            "bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-[length:200%_100%] hover:bg-right",
            login.isPending && "opacity-90"
          )}
        >
          {login.isPending ? "登入中..." : "使用電子郵件繼續"}
        </Button>
      </form>
      <div className="text-xs text-muted-foreground leading-relaxed tracking-tight">
        繼續代表您同意我們的
        <Link to="/terms" className="underline hover:text-foreground ml-1">
          服務條款
        </Link>
        、
        <Link to="/privacy" className="underline hover:text-foreground ml-1">
          隱私權政策
        </Link>
      </div>
    </div>
  );
} 