import { login } from "@/services/auth.server";
import { loginSchema, formatZodErrors } from "@/schemas/auth";
import {
  withErrorHandler,
  createApiResponse,
  createErrorResponse,
  ApiError,
} from "@/middleware/api.server";

export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== "POST") {
      throw new ApiError("Method not allowed", 405);
    }

    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    // 驗證輸入
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      throw new ApiError(
        "Validation failed",
        400,
        formatZodErrors(result.error)
      );
    }

    const loginResponse = await login(result.data);

    // 如果 login 返回的是 redirect Response，我們保持原樣返回
    if (loginResponse instanceof Response) {
      return loginResponse;
    }

    // 否則，我們包裝成 API 響應
    return createApiResponse(loginResponse);
  });
}
