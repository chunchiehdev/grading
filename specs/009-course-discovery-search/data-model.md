# Data Model: Course Discovery Search

**Created**: 2025-10-20
**Status**: ✅ Complete

## Entities

### 1. Course (Existing - No Changes Required)

**Purpose**: Represents a course in the system; search operates against existing Course model

**Fields Used by Search**:

- `id` (UUID, primary key)
- `title` (String, not null) - searchable field
- `description` (String, nullable) - searchable field
- `instructorId` (UUID, FK to User) - for filtering by instructor (future)
- `createdAt` (DateTime) - for sorting recent courses (future)
- `status` (Enum: ACTIVE, ARCHIVED, DRAFT) - filter to ACTIVE only
- `studentIds` (User[], relation) - to respect user permissions

**Validation Rules**:

- Title must be non-empty and less than 500 characters
- Description is optional but if present, less than 5000 characters
- Only ACTIVE courses should appear in search results
- Course must be accessible to the current user (through enrollment or teaching role)

**Search Constraints**:

- Search operates on title + description fields only
- Search is case-insensitive
- Search supports partial matching (substring search)
- Results limited to 100 courses per request (MVP limitation)

---

### 2. SearchQuery (Transient - Client-Side State)

**Purpose**: Captures user's search input and results for current session

**Client-Side State Structure** (Zustand store):

```typescript
interface CourseSearchState {
  // Search input
  query: string;

  // Results
  results: Course[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Request lifecycle
  lastSearchedAt: number | null;
  isDebouncing: boolean;

  // Actions
  setQuery: (query: string) => void;
  setResults: (results: Course[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
```

**Validation Rules**:

- Query string: 0-200 characters
- Query can contain alphanumeric, spaces, common punctuation
- Invalid characters rejected at input level (feedback to user)
- Empty query returns all courses (clears filter)

**State Transitions**:

```
Initial: { query: '', results: [], isLoading: false, error: null }

User types "Math":
  → setQuery('Math')
  → isDebouncing = true

Debounce expires (300-500ms):
  → isDebouncing = false
  → setLoading(true)
  → API call initiated

API Response (success):
  → setLoading(false)
  → setResults([...])
  → setError(null)

API Response (error):
  → setLoading(false)
  → setError('Search failed')
  → keep previous results visible

User clicks clear:
  → setQuery('')
  → reset()

Browser back button:
  → URL param removed
  → setQuery('')
  → API call with empty query (returns all)
```

---

### 3. Search API Request/Response

**Request**:

```typescript
GET /api/discover/search?query=<string>

Query Parameters:
- query (string, optional): Search term to filter courses
  - Max 200 characters
  - URL-encoded
  - Empty string or missing param returns all courses
```

**Response (Success - 200 OK)**:

```typescript
{
  success: true,
  data: {
    results: [
      {
        id: "uuid",
        title: "Advanced Mathematics",
        description: "Comprehensive course covering calculus...",
        instructorId: "uuid",
        instructorName: "Dr. Smith",
        enrollmentCount: 42,
        status: "ACTIVE",
        createdAt: "2025-01-15T10:30:00Z"
      },
      // ... up to 100 results
    ],
    totalCount: 245,  // Total matching courses (not paginated in MVP)
    returnedCount: 100
  }
}
```

**Response (Empty Results - 200 OK)**:

```typescript
{
  success: true,
  data: {
    results: [],
    totalCount: 0,
    returnedCount: 0
  }
}
```

**Response (Error - 400 Bad Request)**:

```typescript
{
  success: false,
  error: "Search query too long (max 200 characters)"
}
```

**Response (Error - 500 Server Error)**:

```typescript
{
  success: false,
  error: "Failed to search courses. Please try again."
}
```

---

## Database Schema Changes

### New Index (Required)

**Purpose**: Optimize search query performance for partial text matching

**Migration**:

```sql
-- Add index on Course table for search performance
CREATE INDEX idx_course_search ON "Course"
USING GIN (
  to_tsvector('english', "title" || ' ' || coalesce("description", ''))
);

-- Simpler alternative if GIN index not supported:
CREATE INDEX idx_course_title ON "Course" ("title");
CREATE INDEX idx_course_description ON "Course" ("description");
```

**Rationale**:

- Supports fast ILIKE queries on title and description
- GIN index allows full-text search patterns if upgraded later
- Performance improvement from O(n) to O(log n) for 10k+ courses

---

## State Flow Diagram

```
User Interface (React Component)
    ↓
useSearchParams Hook (React Router)
    ↓ (URL param: ?search=query)
URL State
    ↓
useEffect (watches URL changes)
    ↓
Debounce Timer (300-500ms)
    ↓
API Call: GET /api/discover/search?query=...
    ↓
Backend Service Layer (course.server.ts)
    ↓
Database Query (Prisma)
    ↓
Course Model (PostgreSQL)
    ↓ (return filtered results)
Response to Frontend
    ↓
Zustand Store (courseSearchStore)
    ↓ (update state)
Component Re-render
    ↓
Display Results / Loading / Error
```

---

## Type Definitions

```typescript
// From existing database schema (app/types/database.ts)
interface Course {
  id: string;
  title: string;
  description: string | null;
  instructorId: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  createdAt: Date;
  updatedAt: Date;
  // ... other fields
}

// Client-side state
interface CourseSearchStore {
  query: string;
  results: Course[];
  isLoading: boolean;
  error: string | null;
  lastSearchedAt: number | null;
  isDebouncing: boolean;
  setQuery: (query: string) => void;
  setResults: (results: Course[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// API response types
interface SearchResponse {
  success: boolean;
  data?: {
    results: Course[];
    totalCount: number;
    returnedCount: number;
  };
  error?: string;
}
```

---

## No Database Migrations Required

The existing `Course` model already contains all required fields (`title`, `description`, `status`). The feature only adds:

- ✅ One index for performance optimization (index creation is safe, non-breaking)
- ❌ No new tables
- ❌ No new columns
- ❌ No schema modifications

All changes are additive and backwards-compatible.
