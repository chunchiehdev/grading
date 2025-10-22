/**
 * Search Error Handling Utilities
 * Centralized error definitions and handling for search functionality
 */

export class SearchError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export const SearchErrorCodes = {
  QUERY_TOO_LONG: 'QUERY_TOO_LONG',
  INVALID_QUERY: 'INVALID_QUERY',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Create a query too long error
 */
export function createQueryTooLongError(maxLength: number): SearchError {
  return new SearchError(
    SearchErrorCodes.QUERY_TOO_LONG,
    `Search query must be less than ${maxLength} characters`,
    400
  );
}

/**
 * Create an invalid query error
 */
export function createInvalidQueryError(): SearchError {
  return new SearchError(SearchErrorCodes.INVALID_QUERY, 'Invalid search query provided', 400);
}

/**
 * Create a not authenticated error
 */
export function createNotAuthenticatedError(): SearchError {
  return new SearchError(SearchErrorCodes.NOT_AUTHENTICATED, 'User not authenticated', 401);
}

/**
 * Create a database error
 */
export function createDatabaseError(): SearchError {
  return new SearchError(
    SearchErrorCodes.DATABASE_ERROR,
    'Search service encountered an error. Please try again later.',
    500
  );
}

/**
 * Create a timeout error
 */
export function createTimeoutError(): SearchError {
  return new SearchError(SearchErrorCodes.TIMEOUT, 'Search took too long. Please try a more specific query.', 504);
}

/**
 * Handle search errors and return appropriate response
 */
export function handleSearchError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof SearchError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'Search failed',
      statusCode: 500,
    };
  }

  return {
    message: 'An unexpected error occurred during search',
    statusCode: 500,
  };
}
