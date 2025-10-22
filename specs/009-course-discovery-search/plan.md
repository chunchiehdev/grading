# Implementation Plan: Course Discovery Search

**Branch**: `009-course-discovery-search` | **Date**: 2025-10-20 | **Spec**: [Course Discovery Search](spec.md)
**Input**: Feature specification from `/specs/009-course-discovery-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add real-time course search functionality to the course discovery page with debounced database queries, URL parameter persistence, and smooth client-side filtering. The feature provides an essential UX improvement for students and teachers to quickly locate courses from expanding catalogs without server overload.

## Technical Context

**Language/Version**: TypeScript with React 19 + React Router v7
**Primary Dependencies**: React Router navigation/search params, Zustand for state, Radix UI for search components, Tailwind CSS for styling
**Storage**: PostgreSQL (existing Course model queried via Prisma ORM)
**Testing**: Vitest + React Testing Library (matching existing test setup)
**Target Platform**: Web browser (desktop, tablet, mobile)
**Project Type**: Web application (existing React Router frontend)
**Performance Goals**: Search results delivered within 1 second of debounce expiration; debounced to max 1 query per 10 characters typed
**Constraints**: <100ms UI lag during typing; support for 10k+ courses without pagination in MVP; no server-side search ranking complexity
**Scale/Scope**: Single feature addition to existing course discovery page (~200-400 lines of code for UI + ~50-100 lines backend)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Status**: ✅ PASSED

- ✅ **Scope**: Single, focused feature with clear MVP scope (3 P1 stories)
- ✅ **Simplicity**: Leverages existing tech stack (React Router, Zustand, Prisma) - no new dependencies
- ✅ **Testing**: Aligns with existing Vitest + React Testing Library setup
- ✅ **No breaking changes**: Additive feature to existing course discovery page
- ✅ **Integration**: Works within existing database schema (no migrations needed)
- ✅ **Performance**: Debouncing strategy prevents server overload; no architectural complexity added

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
app/
├── routes/
│   ├── discover.tsx                    # Existing course discovery route (updates to use search)
│   └── discover/
│       ├── loader.tsx                  # Updated loader to handle search query params
│       └── components/
│           └── CourseSearchBar.tsx      # NEW: Search input + clear button
├── components/
│   └── discover/
│       └── CourseList.tsx               # Existing - receives filtered courses
├── services/
│   └── course.server.ts                 # NEW/Updated: searchCourses() endpoint
├── stores/
│   └── courseSearchStore.ts             # NEW: Search state (Zustand)
└── api/
    └── discover/
        └── search.tsx                   # NEW: API endpoint for course search

tests/
├── integration/
│   └── course-search.test.tsx           # Integration tests: full search flow
├── unit/
│   ├── CourseSearchBar.test.tsx         # Unit: search input component
│   ├── courseSearchStore.test.ts        # Unit: state management
│   └── course.server.test.ts            # Unit: backend search service
└── fixtures/
    └── courses.fixture.ts               # Test data
```

**Structure Decision**: Minimal changes to existing project structure. Feature integrates into existing course discovery route with new component for search input, a service for backend search, a Zustand store for local state, and an API endpoint. All tests follow existing patterns (Vitest + React Testing Library).

## Phase 0: Research & Decisions

**Status**: ✅ COMPLETE - No clarifications needed

### Technology Choices Confirmed

1. **Debounce Implementation**: React Router useSearchParams + custom hook with useEffect

   - **Decision**: Native React Router approach without external debounce library
   - **Rationale**: Already available, minimal bundle size, integrates perfectly with URL persistence
   - **Alternatives**: lodash/debounce (rejected: external dependency), useDebouncedValue custom (rejected: more complex)

2. **Search Scope**: Client-side filtering after server-side database search

   - **Decision**: Server returns filtered results, client shows with loading state, no client-side re-filtering
   - **Rationale**: Simple, leverages database efficiency, matches existing patterns
   - **Alternatives**: Full client-side filtering (rejected: poor for 10k+ courses), pure server-side with server-side URL state (rejected: breaks back button)

3. **API Pattern**: RESTful GET endpoint with search query parameter

   - **Decision**: `GET /api/discover/search?query=...` returns paginated results
   - **Rationale**: Simple, cacheable, idempotent, matches existing API patterns
   - **Alternatives**: GraphQL (rejected: overkill for single search), POST body (rejected: non-standard for search)

4. **State Management**: Zustand + React Router search params (hybrid approach)

   - **Decision**: URL params are source of truth; local Zustand store for UI state (loading, results)
   - **Rationale**: URL persistence + clean state management, matches existing store patterns
   - **Alternatives**: Redux (rejected: overkill), context only (rejected: harder to persist in URL)

5. **Input Validation/Sanitization**: Server-side only
   - **Decision**: Input sanitized in backend service layer before SQL query
   - **Rationale**: XSS/SQL injection prevented at source, leverage existing Prisma parameterized queries
   - **Alternatives**: Client-side + server-side (rejected: redundant, trust server always), client-only (rejected: unsafe)

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

All Phase 1 artifacts have been generated:

### 1. Data Model (`data-model.md`)

**Key Entities**:

- **Course** (existing model, no schema changes): Search operates on title + description
- **SearchQuery** (transient state): Zustand store holds UI state
- **Search API**: GET /api/discover/search with query parameter

**Database Changes**:

- ✅ One new index for search performance (non-breaking, safe)
- ❌ No new tables
- ❌ No new columns
- ❌ No schema migrations needed

### 2. API Contracts (`contracts/search-api.ts`)

**Endpoint**: `GET /api/discover/search?query=...`

**Request**: Query string parameter (0-200 chars)

**Response** (Success):

```json
{
  "success": true,
  "data": {
    "results": [...],
    "totalCount": 245,
    "returnedCount": 100
  }
}
```

**Response** (Error):

```json
{
  "success": false,
  "error": "Search query too long"
}
```

**Type Safety**: TypeScript interfaces for all request/response shapes

### 3. Quickstart Guide (`quickstart.md`)

Complete implementation guide with:

- Backend service implementation (1 day)
- Frontend components and hooks (1 day)
- Test setup (0.5-1 day)
- Running instructions
- Success criteria verification

### 4. Implementation Structure

**Backend** (`app/services/`, `app/api/`):

- `course.server.ts`: searchCourses() function
- `api/discover/search.tsx`: API endpoint

**Frontend** (`app/stores/`, `app/hooks/`, `app/components/`):

- `courseSearchStore.ts`: Zustand store for UI state
- `hooks/useCourseSearch.ts`: Custom hook with debounce logic
- `components/discover/CourseSearchBar.tsx`: Search input component
- Update `routes/discover.tsx`: Integrate search
- Update `components/discover/CourseList.tsx`: Handle search results

**Tests**:

- Unit: Store, hook, component tests
- Integration: Full search flow
- Fixtures: Test course data

---

## Constitution Check - Phase 1 Re-evaluation

**Status**: ✅ PASSED (No violations)

- ✅ **Design aligns with existing patterns**: Uses React Router, Zustand, Prisma (existing stack)
- ✅ **No new external dependencies**: All tools already available
- ✅ **Minimal code complexity**: ~500-600 LOC total (well within bounds)
- ✅ **Backwards compatible**: Additive feature, no breaking changes
- ✅ **Database safe**: Only adds index, no migrations needed
- ✅ **Test-friendly**: All layers independently testable

---

## Ready for Phase 2

All design decisions documented. All contracts defined. All code structure planned.

**Next Step**: Run `/speckit.tasks` to generate detailed task list for implementation.
