import { login } from '@/services/auth.server';
import { loginSchema, formatZodErrors } from '@/schemas/auth';
import { withErrorHandler, ApiError } from '@/middleware/api.server';

/**
 * API endpoint for user login with form data validation
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object with form data
 * @returns {Promise<Response>} Redirect response with session cookie or error
 */
export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== 'POST') {
      throw new ApiError('Method not allowed', 405);
    }

    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = loginSchema.safeParse(data);
    if (!result.success) {
      throw new ApiError('Validation failed', 400, formatZodErrors(result.error));
    }

    const response = await login(result.data);

    if (response instanceof Response) {
      return response;
    }

    throw new ApiError('Login failed', 500);
  });
}
