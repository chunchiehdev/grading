# Research: Course Discovery Search

**Created**: 2025-10-20
**Status**:   Complete

## Technology Stack Validation

### 1. Debouncing Strategy

**Decision**: Use React Router's built-in `useSearchParams` hook combined with `useEffect` for debounce logic

**Rationale**:

- React Router v7 provides native search params management
- Integrates seamlessly with URL persistence requirement
- Native JavaScript `setTimeout` eliminates external dependency
- Simpler than external libraries for this simple use case

**Implementation Approach**:

```
- useSearchParams() hook reads current search query
- useEffect monitors searchParams changes
- setTimeout debounces the actual search API call
- Custom hook: useDebouncedSearch(delayMs) encapsulates logic
```

**Alternatives Considered**:

- ❌ lodash/debounce: Adds external dependency, less idiomatic with React Hooks
- ❌ useDebouncedValue from custom hook: More boilerplate, harder to test
-   Native React Router + useEffect: Idiomatic, no dependencies, proven pattern

---

### 2. Server-Side Search Implementation

**Decision**: Implement search in backend service layer using Prisma ORM's `findMany` with `where` filter

**Rationale**:

- Existing Course model already has title and description fields
- Prisma handles parameterized queries (prevents SQL injection)
- Case-insensitive search: Use PostgreSQL `ILIKE` operator
- Partial matching: Use SQL `LIKE '%query%'` pattern

**Implementation Approach**:

```typescript
// Service: course.server.ts
export async function searchCourses(query: string, userId: string) {
  const sanitized = query.trim().slice(0, 200); // Length limit
  return await db.course.findMany({
    where: {
      OR: [
        { title: { contains: sanitized, mode: 'insensitive' } },
        { description: { contains: sanitized, mode: 'insensitive' } },
      ],
      // Only return courses user has access to (via existing join/permission logic)
    },
    take: 100, // Limit results for MVP
  });
}
```

**Alternatives Considered**:

- ❌ Full-text search (PostgreSQL FTS): Overkill for MVP, adds complexity
- ❌ Elasticsearch: External service, too much infrastructure for MVP
-   Simple ILIKE with LIMIT: Matches MVP requirements, proven performance for 10k+ records with proper indexing

---

### 3. API Endpoint Design

**Decision**: RESTful GET endpoint at `/api/discover/search`

**Rationale**:

- GET method is standard for searches (idempotent, cacheable)
- Query parameter in URL (`?query=...`) matches standard pattern
- Simple, no complex payload design needed
- Works with browser back button and bookmark sharing

**Implementation Approach**:

```
GET /api/discover/search?query=<search_term>

Response (200 OK):
{
  success: true,
  data: [
    { id, title, description, instructorName, ... },
    ...
  ]
}

Response (400 Bad Request):
{
  success: false,
  error: "Search query too long"
}

Response (500 Server Error):
{
  success: false,
  error: "Search failed"
}
```

**Alternatives Considered**:

- ❌ POST /api/discover/search (body): Non-standard for searches
- ❌ GraphQL: Adds complexity, no real benefit for single query
-   GET /api/discover/search: Standard, simple, proven

---

### 4. Client-Side State Management

**Decision**: Hybrid approach - URL params + Zustand store for UI state

**Rationale**:

- URL params are source of truth (enables sharing, back button)
- Zustand store holds transient state: `{ loading: bool, results: [], error: string }`
- Separates concerns: URL = application state, store = UI state
- Matches existing codebase patterns (already uses Zustand)

**Implementation Approach**:

```typescript
// URL: source of truth for search query
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get('search') || '';

// Store: UI state
const { loading, results, error, setLoading, setResults, setError } = useDiscoverySearchStore();

// Flow:
// 1. User types → updates URL searchParams (debounced)
// 2. useEffect watches URL changes → calls API
// 3. API call sets loading=true
// 4. Response updates results/error, loading=false
```

**Alternatives Considered**:

- ❌ URL params only: Causes full component re-renders, flickering
- ❌ Store only: Breaks URL persistence, complicates sharing
-   Hybrid: Clean separation, good performance, solves all requirements

---

### 5. Input Sanitization & Security

**Decision**: Server-side sanitization only; trust Prisma's parameterized queries

**Rationale**:

- Backend controls database safety (XSS/SQL injection prevention)
- Prisma ORM uses parameterized queries by default
- Input length limited to 200 chars (prevents abuse)
- No dangerous characters need client-side blocking

**Implementation Approach**:

```typescript
// Input validation in backend
const MAX_QUERY_LENGTH = 200;

if (!query || typeof query !== 'string') {
  throw new ApiError(400, 'Invalid search query');
}

const sanitized = query.trim().slice(0, MAX_QUERY_LENGTH);

// Prisma uses parameterized queries, safe from SQL injection
return db.course.findMany({
  where: {
    OR: [
      { title: { contains: sanitized, mode: 'insensitive' } },
      { description: { contains: sanitized, mode: 'insensitive' } },
    ],
  },
});
```

**Alternatives Considered**:

- ❌ Client-side validation only: Insufficient, trust server not client
- ❌ Client + server validation: Redundant, slower
-   Server-side via Prisma: Single source of truth, proven safe pattern

---

### 6. Database Query Optimization

**Decision**: Add index on `(title, description)` columns in Course table for search performance

**Rationale**:

- ILIKE queries without index are full table scans for large datasets
- Index significantly improves performance for partial text matching
- Existing migrations framework supports adding index

**Implementation Approach**:

```sql
-- Migration: add_course_search_index
CREATE INDEX idx_course_title_description ON "Course"
USING GIN (
  to_tsvector('english', "title" || ' ' || "description")
);
```

Or simpler prefix index:

```sql
CREATE INDEX idx_course_title ON "Course" ("title");
CREATE INDEX idx_course_description ON "Course" ("description");
```

**Alternatives Considered**:

- ❌ No index: Poor performance for 10k+ records
- ❌ Single column index: Searches must use only one field
-   Multi-column or GIN index: Fast, supports combined searches

---

## Conclusion

All technology choices are aligned with:

1.   Existing codebase patterns (React Router, Zustand, Prisma)
2.   MVP requirements (no external dependencies, simple implementation)
3.   Security best practices (server-side validation, parameterized queries)
4.   Performance targets (debouncing, database indexing, result limits)
5.   User experience (URL persistence, browser back button, smooth updates)

**Ready for Phase 1: Design & Contracts**
