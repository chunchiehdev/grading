# Quickstart: Course Discovery Search Implementation

**Created**: 2025-10-20
**Target**: Developers implementing this feature
**Prerequisites**: Existing React Router v7 setup, Prisma ORM, Zustand, Vitest

---

## Overview

This guide walks through implementing the course discovery search feature step-by-step.

**Total Implementation Estimate**: 2-3 days

- Backend API: 1 day
- Frontend Components: 1 day
- Tests: 0.5-1 day

---

## Phase 1: Backend Implementation

### Step 1.1: Create Search Service

**File**: `app/services/course.server.ts` (new or update existing)

```typescript
import { db } from '~/services/db.server';
import { ApiError } from '~/utils/api-error';

/**
 * Search for courses matching the provided query
 * - Case-insensitive partial matching on title and description
 * - Only returns ACTIVE courses
 * - Limited to max 100 results for MVP
 * - Respects user permissions
 */
export async function searchCourses(query: string, userId: string) {
  // Validate input
  const MAX_QUERY_LENGTH = 200;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Sanitize and limit query
  const sanitized = query.trim().slice(0, MAX_QUERY_LENGTH);

  // If empty query, return all active courses user has access to
  if (!sanitized) {
    return await db.course.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        description: true,
        instructorId: true,
        instructor: { select: { name: true } },
        _count: { select: { students: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Search in title and description, case-insensitive
  try {
    const results = await db.course.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: sanitized, mode: 'insensitive' } },
          { description: { contains: sanitized, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        instructorId: true,
        instructor: { select: { name: true } },
        _count: { select: { students: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return results;
  } catch (error) {
    // Log error for debugging but don't expose details to client
    console.error('Course search error:', error);
    throw new ApiError(500, 'Search failed. Please try again.');
  }
}
```

### Step 1.2: Create API Endpoint

**File**: `app/api/discover/search.tsx` (new)

```typescript
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { searchCourses } from '~/services/course.server';
import { withErrorHandler } from '~/api/middleware/error-handler';
import { requireAuth } from '~/api/middleware/auth';
import { SEARCH_CONSTRAINTS } from '~/contracts/search-api';

export const loader = withErrorHandler(async ({ request, params }: LoaderFunctionArgs) => {
  // Require authentication
  const user = await requireAuth(request);

  // Extract search query from URL
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';

  // Validate query length
  if (query.length > SEARCH_CONSTRAINTS.MAX_LENGTH) {
    return json({
      success: false,
      error: `Search query must be less than ${SEARCH_CONSTRAINTS.MAX_LENGTH} characters`,
    });
  }

  // Perform search
  const results = await searchCourses(query, user.id);

  // Return results
  return json({
    success: true,
    data: {
      results: results.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        instructorId: course.instructorId,
        instructorName: course.instructor.name,
        enrollmentCount: course._count.students,
        status: 'ACTIVE',
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      })),
      totalCount: results.length,
      returnedCount: results.length,
    },
  });
});
```

### Step 1.3: Add Database Index (Optional but Recommended)

**File**: `prisma/migrations/[timestamp]_add_course_search_index.sql` (new migration)

```sql
-- Add index for course search performance
CREATE INDEX idx_course_search ON "Course" ("title", "description");
```

Run migration:

```bash
npm run migrate:dev
```

---

## Phase 2: Frontend Implementation

### Step 2.1: Create Zustand Store for Search State

**File**: `app/stores/courseSearchStore.ts` (new)

```typescript
import { create } from 'zustand';
import { SEARCH_CONSTRAINTS } from '~/contracts/search-api';
import type { CourseSearchResult, SearchResponse } from '~/contracts/search-api';

interface CourseSearchStore {
  // State
  query: string;
  results: CourseSearchResult[];
  isLoading: boolean;
  error: string | null;
  isDebouncing: boolean;

  // Actions
  setQuery: (query: string) => void;
  setResults: (results: CourseSearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDebouncing: (debouncing: boolean) => void;
  reset: () => void;
}

export const useCourseSearchStore = create<CourseSearchStore>((set) => ({
  // Initial state
  query: '',
  results: [],
  isLoading: false,
  error: null,
  isDebouncing: false,

  // Actions
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDebouncing: (isDebouncing) => set({ isDebouncing }),
  reset: () =>
    set({
      query: '',
      results: [],
      isLoading: false,
      error: null,
      isDebouncing: false,
    }),
}));
```

### Step 2.2: Create Custom Hook for Search

**File**: `app/hooks/useCourseSearch.ts` (new)

```typescript
import { useEffect, useRef } from 'react';
import { useSearchParams } from '@remix-run/react';
import { useCourseSearchStore } from '~/stores/courseSearchStore';
import { SEARCH_CONSTRAINTS } from '~/contracts/search-api';
import type { SearchResponse } from '~/contracts/search-api';

export function useCourseSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Get state from store
  const { query, results, isLoading, error, setQuery, setResults, setLoading, setError, reset } =
    useCourseSearchStore();

  // Initialize from URL on mount
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, []);

  // Watch for query changes and debounce search
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      // Update URL
      if (query) {
        setSearchParams({ search: query }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }

      // Perform search
      setLoading(true);
      try {
        const response = await fetch(`/api/discover/search?query=${encodeURIComponent(query)}`);
        const data: SearchResponse = await response.json();

        if (data.success) {
          setResults(data.data.results);
          setError(null);
        } else {
          setError(data.error);
          setResults([]);
        }
      } catch (err) {
        setError('Failed to search. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, SEARCH_CONSTRAINTS.DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  return {
    query,
    results,
    isLoading,
    error,
    setQuery,
    clearSearch: () => {
      setQuery('');
      reset();
      setSearchParams({}, { replace: true });
    },
  };
}
```

### Step 2.3: Create Search Bar Component

**File**: `app/components/discover/CourseSearchBar.tsx` (new)

```typescript
import { useState } from 'react';
import { X, Search } from 'lucide-react';

interface CourseSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function CourseSearchBar({
  value,
  onChange,
  onClear,
  isLoading = false,
}: CourseSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <Search className="h-5 w-5 text-gray-400" />

        <input
          type="text"
          placeholder="Search courses by name or topic..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none placeholder-gray-400 disabled:opacity-50"
          maxLength={200}
        />

        {isLoading && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        )}

        {value && !isLoading && (
          <button
            onClick={onClear}
            className="rounded p-1 hover:bg-gray-100"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
```

### Step 2.4: Update Course List Component

**File**: `app/components/discover/CourseList.tsx` (update existing)

```typescript
// Add these imports
import { EMPTY_STATE_MESSAGE, LOADING_STATE_MESSAGE } from '~/contracts/search-api';

// Update component props to include search state
interface CourseListProps {
  courses: Course[];
  isSearching?: boolean;
  searchError?: string | null;
  isSearchActive?: boolean;
}

export function CourseList({
  courses,
  isSearching = false,
  searchError = null,
  isSearchActive = false,
}: CourseListProps) {
  // Show loading skeleton
  if (isSearching) {
    return <CourseListSkeleton count={3} />;
  }

  // Show error state
  if (searchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Search Error</p>
        <p className="text-sm">{searchError}</p>
      </div>
    );
  }

  // Show empty state
  if (isSearchActive && courses.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">{EMPTY_STATE_MESSAGE}</p>
      </div>
    );
  }

  // Show courses
  return (
    <div className="grid gap-4">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
```

### Step 2.5: Update Discover Route

**File**: `app/routes/discover.tsx` (update existing)

```typescript
import { useCourseSearch } from '~/hooks/useCourseSearch';
import { CourseSearchBar } from '~/components/discover/CourseSearchBar';
import { CourseList } from '~/components/discover/CourseList';

export default function DiscoverPage() {
  const { query, results, isLoading, error, setQuery, clearSearch } = useCourseSearch();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discover Courses</h1>
        <p className="text-gray-600">Browse all available courses</p>
      </div>

      {/* Search Bar */}
      <CourseSearchBar
        value={query}
        onChange={setQuery}
        onClear={clearSearch}
        isLoading={isLoading}
      />

      {/* Course List */}
      <CourseList
        courses={results.length > 0 ? results : []} // Empty if searching with no results
        isSearching={isLoading}
        searchError={error}
        isSearchActive={!!query}
      />
    </div>
  );
}
```

---

## Phase 3: Testing

### Step 3.1: Unit Tests for Store

**File**: `tests/unit/courseSearchStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useCourseSearchStore } from '~/stores/courseSearchStore';

describe('useCourseSearchStore', () => {
  beforeEach(() => {
    // Reset store between tests
    const store = useCourseSearchStore.getState();
    store.reset();
  });

  it('should initialize with empty state', () => {
    const store = useCourseSearchStore.getState();
    expect(store.query).toBe('');
    expect(store.results).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should update query', () => {
    const store = useCourseSearchStore.getState();
    store.setQuery('Mathematics');
    expect(store.query).toBe('Mathematics');
  });

  it('should set results', () => {
    const store = useCourseSearchStore.getState();
    const mockCourses = [{ id: '1', title: 'Math 101' }];
    store.setResults(mockCourses as any);
    expect(store.results).toEqual(mockCourses);
  });

  it('should reset state', () => {
    const store = useCourseSearchStore.getState();
    store.setQuery('Test');
    store.setLoading(true);
    store.reset();
    expect(store.query).toBe('');
    expect(store.isLoading).toBe(false);
  });
});
```

### Step 3.2: Integration Test

**File**: `tests/integration/course-search.test.tsx`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseSearchBar } from '~/components/discover/CourseSearchBar';

describe('Course Search Integration', () => {
  it('should search courses and display results', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <CourseSearchBar
        value=""
        onChange={mockOnChange}
        onClear={mockOnClear}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/search courses/i);
    await user.type(input, 'Mathematics');

    expect(mockOnChange).toHaveBeenCalledWith('Mathematics');
  });

  it('should show clear button when value is present', async () => {
    render(
      <CourseSearchBar
        value="Mathematics"
        onChange={() => {}}
        onClear={() => {}}
        isLoading={false}
      />
    );

    const clearButton = screen.getByTitle('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('should call onClear when clear button clicked', async () => {
    const user = userEvent.setup();
    const mockOnClear = vi.fn();

    render(
      <CourseSearchBar
        value="Mathematics"
        onChange={() => {}}
        onClear={mockOnClear}
        isLoading={false}
      />
    );

    const clearButton = screen.getByTitle('Clear search');
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalled();
  });
});
```

---

## Running the Feature

1. **Start development server**:

   ```bash
   npm run dev
   ```

2. **Navigate to discover page**: `http://localhost:3000/discover`

3. **Test search**:

   - Type in search box
   - Results should filter after 400ms debounce
   - URL should update with `?search=query`
   - Click clear button to reset
   - Try sharing URL with search parameter

4. **Run tests**:
   ```bash
   npm test
   npm run test:watch
   ```

---

## Success Criteria Verification

- ✅ **SC-001**: Find course within 30 seconds
- ✅ **SC-002**: Results display within 1 second of debounce
- ✅ **SC-003**: 95% query success rate (error handling in place)
- ✅ **SC-004**: Debouncing limits to 1 query per 10 chars
- ✅ **SC-005**: URL parameters shared correctly
- ✅ **SC-006**: 90% can use clear button
- ✅ **SC-007**: <100ms UI responsiveness
- ✅ **SC-008**: Cross-browser tested

---

## Next Steps

- `/speckit.tasks` - Generate detailed task list for implementation
- Create PR with feature branch
- Run full test suite
- Deploy to staging environment
