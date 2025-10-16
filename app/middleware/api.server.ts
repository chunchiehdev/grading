import {
  getUser,
  requireAuth as serviceRequireAuth,
  requireAuthForApi,
  requireTeacher,
  requireStudent,
} from '@/services/auth.server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export class ApiError extends Error {
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

export async function requireAuth(request: Request): Promise<Response | null> {
  const user = await getUser(request);

  if (!user) {
    return Response.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  return null;
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

export function createErrorResponse(message: string, status: number = 400, errors?: Record<string, string>): Response {
  return Response.json(
    {
      success: false,
      error: message,
      errors,
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

/**
 * Higher-order function to require teacher role
 */
export function withTeacher<T extends Response>(handler: AuthenticatedFunction<T>): LoaderFunction | ActionFunction {
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
      if (user.role !== 'TEACHER') {
        return Response.json(
          {
            success: false,
            error: 'Forbidden - Teacher role required',
          },
          { status: 403 }
        );
      }
      return handler({ ...args, user });
    });
  };
}

/**
 * Higher-order function to require student role
 */
export function withStudent<T extends Response>(handler: AuthenticatedFunction<T>): LoaderFunction | ActionFunction {
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
      if (user.role !== 'STUDENT') {
        return Response.json(
          {
            success: false,
            error: 'Forbidden - Student role required',
          },
          { status: 403 }
        );
      }
      return handler({ ...args, user });
    });
  };
}
