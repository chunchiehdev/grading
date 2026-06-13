import { requireAuthForApi } from '@/services/auth.server';

class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function withErrorHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof ApiError) {
      return Response.json(
        {
          success: false,
          error: error.message,
          errors: error.errors,
        },
        { status: error.statusCode }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export function createApiResponse<T>(data: T, status: number = 200): Response {
  return Response.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

// High-order function types
type LoaderFunction = (args: { request: Request; params: any }) => Promise<Response>;
type ActionFunction = (args: { request: Request; params: any }) => Promise<Response>;
type AuthenticatedFunction<T> = (args: { request: Request; params: any; user: any }) => Promise<T>;

/**
 * Higher-order function to add authentication to API handlers
 * This eliminates the repetitive pattern of getUserId/requireAuth in every route
 */
export function withAuth<T extends Response>(handler: AuthenticatedFunction<T>): LoaderFunction | ActionFunction {
  return async (args) => {
    return withErrorHandler(async () => {
      const user = await requireAuthForApi(args.request);
      if (!user) {
        return Response.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          { status: 401 }
        );
      }
      return handler({ ...args, user });
    });
  };
}
