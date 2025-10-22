/**
 * Course Discovery Search API Contract
 *
 * This defines the API contract between frontend and backend for the course search feature.
 * These types should be imported by both backend service and frontend components.
 */

/**
 * Search Request
 * Query parameters passed to the search endpoint
 */
export interface SearchRequest {
  /** Search query string (0-200 chars) */
  query?: string;
}

/**
 * Course Data returned in search results
 */
export interface CourseSearchResult {
  /** Unique course identifier */
  id: string;

  /** Course title/name */
  title: string;

  /** Course description (optional) */
  description: string | null;

  /** ID of the instructor */
  instructorId: string;

  /** Instructor's display name */
  instructorName: string;

  /** Number of students enrolled */
  enrollmentCount: number;

  /** Course status */
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';

  /** Course creation timestamp */
  createdAt: string; // ISO 8601 format

  /** Course last update timestamp */
  updatedAt: string; // ISO 8601 format
}

/**
 * Successful Search Response
 * Returned when search completes successfully (HTTP 200)
 */
export interface SearchSuccessResponse {
  success: true;
  data: {
    /** Array of courses matching search criteria */
    results: CourseSearchResult[];

    /** Total number of courses matching criteria */
    totalCount: number;

    /** Number of results returned (max 100 for MVP) */
    returnedCount: number;
  };
}

/**
 * Error Search Response
 * Returned when search encounters an error
 */
export interface SearchErrorResponse {
  success: false;

  /** Error message describing what went wrong */
  error: string;
}

/**
 * Complete Search Response Type
 * Union of success and error responses
 */
export type SearchResponse = SearchSuccessResponse | SearchErrorResponse;

/**
 * Search Query Validation Rules
 */
export const SEARCH_CONSTRAINTS = {
  /** Minimum query length (0 = no minimum, empty is allowed) */
  MIN_LENGTH: 0,

  /** Maximum query length in characters */
  MAX_LENGTH: 200,

  /** Maximum results returned per request */
  MAX_RESULTS: 100,

  /** Debounce delay in milliseconds */
  DEBOUNCE_DELAY_MS: 400,

  /** API request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 10000,
} as const;

/**
 * Search Error Messages
 * User-friendly error messages for common failure scenarios
 */
export const SEARCH_ERRORS = {
  QUERY_TOO_LONG: `Search query must be less than ${SEARCH_CONSTRAINTS.MAX_LENGTH} characters`,
  INVALID_QUERY: 'Invalid search query provided',
  NETWORK_ERROR: 'Failed to search. Please check your connection and try again.',
  SERVER_ERROR: 'Search service encountered an error. Please try again later.',
  TIMEOUT: 'Search took too long. Please try a more specific query.',
} as const;

/**
 * Empty state message when no results found
 */
export const EMPTY_STATE_MESSAGE = 'No courses match your search. Try different keywords.';

/**
 * Loading state message
 */
export const LOADING_STATE_MESSAGE = 'Searching courses...';

/**
 * Helper: Type guard to check if response is successful
 */
export function isSearchSuccessResponse(response: SearchResponse): response is SearchSuccessResponse {
  return response.success === true;
}

/**
 * Helper: Extract results from response safely
 */
export function getSearchResults(response: SearchResponse): CourseSearchResult[] {
  return isSearchSuccessResponse(response) ? response.data.results : [];
}

/**
 * Helper: Extract error message from response safely
 */
export function getSearchError(response: SearchResponse): string | null {
  return !isSearchSuccessResponse(response) ? response.error : null;
}

/**
 * Frontend Hook Interface
 * Describes the contract for useCourseSearch hook
 */
export interface UseCourseSearchHook {
  /** Current search query */
  query: string;

  /** Search results */
  results: CourseSearchResult[];

  /** Whether a search is currently in progress */
  isLoading: boolean;

  /** Error message if search failed, null otherwise */
  error: string | null;

  /** Update the search query (debounced automatically) */
  setQuery: (query: string) => void;

  /** Clear the search and return to showing all courses */
  clearSearch: () => void;

  /** Manually trigger a search with current query */
  refetch: () => Promise<void>;
}

/**
 * Backend Service Interface
 * Describes the contract for searchCourses service function
 */
export interface SearchCoursesService {
  /**
   * Search for courses matching the provided query
   *
   * @param query - Search query string (will be sanitized)
   * @param userId - Current user ID for permission checking
   * @returns Array of matching courses (max 100)
   * @throws ApiError if search fails or user lacks permissions
   */
  (query: string, userId: string): Promise<CourseSearchResult[]>;
}
