// routes/_auth.register.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { register } from "@/services/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!email || !password || !confirmPassword) {
    return Response.json(
      { errors: { general: "所有欄位都是必填的" } },
      { status: 400 }
    );
  }

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return Response.json(
      { errors: { general: "無效的輸入" } },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return Response.json(
      { errors: { confirmPassword: "密碼不一致" } },
      { status: 400 }
    );
  }

  return register({ email, password });
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <>
      <Form method="post" className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            電子郵件
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-900"
              placeholder="信箱地址"
            />
          </div>
          {actionData?.errors?.email && (
            <p className="mt-1 text-sm text-red-500">
              {actionData.errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            密碼
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-900"
              placeholder="輸入密碼"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            確認密碼
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-900"
              placeholder="確認密碼"
            />
          </div>
          {actionData?.errors?.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">
              {actionData.errors.confirmPassword}
            </p>
          )}
        </div>

        {actionData?.errors?.general && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <p className="text-sm text-red-700 dark:text-red-200">
              {actionData.errors.general}
            </p>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isSubmitting ? "註冊中..." : "註冊"}
          </button>
        </div>
      </Form>

      <div className="mt-6 flex items-center justify-center">
        <div className="text-sm">
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            已經有帳號了？登入
          </Link>
        </div>
      </div>
    </>
  );
}
