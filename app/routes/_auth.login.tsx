// routes/_auth.login.tsx
import {
  type ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { login, getUser } from "@/services/auth.server";
import type { AuthError } from "@/types/auth";

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
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors as AuthError;

  return (
    <Form method="post" className="mt-8 space-y-6">
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            電子郵件
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-900"
            placeholder="請輸入電子郵件"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            密碼
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-900"
            placeholder="請輸入密碼"
          />
        </div>
      </div>

      {errors?.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      {errors?.password && (
        <p className="text-red-500 text-sm">{errors.password}</p>
      )}

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            "登入"
          )}
        </Button>
      </div>

      <div className="text-sm text-center mt-4">
        <Link
          to="/register"
          className="font-medium text-primary hover:text-primary/80"
        >
          馬上註冊
        </Link>
      </div>
    </Form>
  );
}
