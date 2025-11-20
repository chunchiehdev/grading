# Tasks: Course Discovery Search

**Input**: Design documents from `/specs/009-course-discovery-search/`
**Prerequisites**: plan.md  , spec.md  , data-model.md  , contracts/  
**Branch**: `009-course-discovery-search`

**Test Strategy**: Tests are included for this feature (comprehensive test coverage recommended per feature scope and existing project standards)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. User Stories 1-3 (P1) form the MVP; Stories 4-6 (P2) are enhancements.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3...)
- Exact file paths provided for all tasks

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database preparation

- [ ] T001 Create database migration for course search index: `prisma/migrations/[timestamp]_add_course_search_index.sql`
- [ ] T002 [P] Copy API contract types to frontend: `app/contracts/search-api.ts` (already provided, ensure accessible)
- [ ] T003 Create test fixtures for course data: `tests/fixtures/courses.fixture.ts`

**Checkpoint**: Database indexes in place, contract types available, test data ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create Zustand store for search state: `app/stores/courseSearchStore.ts` with query, results, isLoading, error, isDebouncing properties
- [ ] T005 [P] Create custom hook for debounced search logic: `app/hooks/useCourseSearch.ts` that integrates React Router searchParams with Zustand
- [ ] T006 [P] Create backend search service function: `app/services/course.server.ts` - implement searchCourses() with Prisma ILIKE queries
- [ ] T007 [P] Create API endpoint structure: `app/api/discover/search.tsx` with GET handler, input validation, response formatting
- [ ] T008 Create API contract file at: `app/contracts/search-api.ts` with TypeScript interfaces for SearchRequest, CourseSearchResult, SearchResponse
- [ ] T009 [P] Create error handling utilities in service layer for search-specific errors (query too long, timeout, invalid input)
- [ ] T010 [P] Create unit test suite for courseSearchStore: `tests/unit/courseSearchStore.test.ts` (tests FIRST - must FAIL initially)

**Checkpoint**: Foundation ready - all user stories can now proceed. Store, hook, service, and endpoint scaffolding complete.

---

## Phase 3: User Story 1 - Search Courses by Text (Priority: P1) 🎯 MVP

**Goal**: Users can type keywords in a search box and see filtered courses matching their query in real-time

**Independent Test**:

1. Type "Mathematics" in search box → verify only courses with "Mathematics" in title/description appear
2. Type "advanced" → results filter to match "advanced" courses
3. Type query matching 0 courses → empty state message appears
4. Delete characters to broaden search → more courses appear in results

### Tests for User Story 1 ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] Unit test for search input text matching: `tests/unit/courseSearchBar.test.tsx` - test typing and character input
- [ ] T012 [P] [US1] Unit test for result filtering: `tests/unit/courseSearchResults.test.tsx` - test results display based on query
- [ ] T013 [P] [US1] Contract test for search endpoint: `tests/contract/search-api.test.ts` - test GET /api/discover/search?query=X returns correct format
- [ ] T014 [P] [US1] Integration test for full search flow: `tests/integration/course-search-flow.test.tsx` - type → debounce → API call → results display
- [ ] T015 [US1] Backend unit test for searchCourses service: `tests/unit/course.server.test.ts` - test ILIKE query generation and Course filtering

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create CourseSearchBar component: `app/components/discover/CourseSearchBar.tsx` with input field, clear button, character counter
- [ ] T017 [P] [US1] Implement search input onChange handler in component that updates Zustand store with debounce (calls setQuery)
- [ ] T018 [US1] Implement API endpoint logic in `app/api/discover/search.tsx` - parse query param, call searchCourses service, format response
- [ ] T019 [US1] Implement backend searchCourses function in `app/services/course.server.ts` using Prisma to query Course model (ILIKE on title and description, max 100 results, ACTIVE status only)
- [ ] T020 [P] [US1] Update CourseList component: `app/components/discover/CourseList.tsx` to accept and display search results, show results count
- [ ] T021 [US1] Integrate CourseSearchBar and CourseList into discover route: `app/routes/discover.tsx` - wire up component state, pass search query to loader
- [ ] T022 [US1] Add input sanitization in backend service - validate query length (max 200 chars), trim whitespace, handle empty queries
- [ ] T023 [US1] Add error handling in service and endpoint - catch database errors, return user-friendly error messages
- [ ] T024 [US1] Test User Story 1 independently - run `npm test`, verify all T011-T015 tests PASS, run through manual test scenarios

**Checkpoint**: User Story 1 fully functional and tested. Users can search courses by text, results filter in real-time. MVP ready to demo/deploy.

---

## Phase 4: User Story 2 - Debounced Server Requests (Priority: P1)

**Goal**: Search requests are debounced (max 1 request per 10 characters typed) to prevent server overload

**Independent Test**:

1. Type "P-y-t-h-o-n" rapidly (6 characters) → only 1 server request made (not 6)
2. Type char → debounce timer starts, type another char before 400ms expires → timer resets
3. Stop typing for 400ms → single request sent
4. Verify network tab shows 1 request, not multiple

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] Unit test for debounce logic: `tests/unit/useCourseSearch.test.ts` - mock useSearchParams, verify setTimeout behavior, test timer reset
- [ ] T026 [P] [US2] Integration test for debounce with API: `tests/integration/debounce.test.tsx` - type rapidly, verify only 1 API call made after delay
- [ ] T027 [US2] Performance test for request frequency: `tests/performance/search-requests.test.tsx` - type 10-char query, measure request count (should be 1)

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement debounce hook in `app/hooks/useCourseSearch.ts` using useEffect with setTimeout (400ms delay), cleanup on unmount
- [ ] T029 [P] [US2] Update CourseSearchBar onChange to only update store immediately, debounce happens in hook
- [ ] T030 [US2] Add loading state indicator in CourseSearchBar component - show during debounce and API call
- [ ] T031 [US2] Wire debounce hook into discover route - useEffect watches store.query, debounces API call
- [ ] T032 [US2] Add debounce timer visualization (optional) - show loading spinner during 400ms wait period
- [ ] T033 [US2] Test User Story 2 independently - verify only 1 request per rapid typing session, test timer resets on continued input

**Checkpoint**: User Story 1 + 2 both work. Debouncing prevents server overload. Search feels responsive.

---

## Phase 5: User Story 3 - Clear Search Functionality (Priority: P1)

**Goal**: Users can click a "Clear" button to instantly reset search and show all courses

**Independent Test**:

1. Search for "Math" → see filtered results
2. Click clear button → search box empties, all courses show, URL parameter removed
3. Empty search box on page load → clear button is hidden/disabled
4. After clearing → URL has no ?search parameter

### Tests for User Story 3 ⚠️

- [ ] T034 [P] [US3] Unit test for clear button: `tests/unit/CourseSearchBar.test.tsx` - test button only visible when query present
- [ ] T035 [P] [US3] Unit test for store reset: `tests/unit/courseSearchStore.test.ts` - verify reset() clears all state
- [ ] T036 [US3] Integration test for clear flow: `tests/integration/clear-search.test.tsx` - search → clear → verify empty state and all courses return

### Implementation for User Story 3

- [ ] T037 [P] [US3] Add clear button to CourseSearchBar component: `app/components/discover/CourseSearchBar.tsx` with X icon, visible only when query.length > 0
- [ ] T038 [P] [US3] Implement clearSearch function in useCourseSearch hook that calls store.reset() and updates URL params
- [ ] T039 [US3] Wire clear button onClick to clearSearch function in CourseSearchBar
- [ ] T040 [US3] Update backend searchCourses to handle empty query (return all ACTIVE courses sorted by createdAt DESC)
- [ ] T041 [US3] Test User Story 3 independently - verify clear button appears/hides correctly, clicking clears search and shows all courses

**Checkpoint**: MVP complete with 3 P1 stories. Users can search, results debounce efficiently, clear resets search. All stories independently tested.

---

## Phase 6: User Story 4 - Loading State Display (Priority: P2)

**Goal**: Show loading indicator while search is in progress so users know request is being processed

**Independent Test**:

1. Type search query → after 400ms debounce, see loading spinner/skeleton in results area
2. While loading, spinner persists → results arrive → spinner disappears
3. Refine search → loading state appears again

### Tests for User Story 4 ⚠️

- [ ] T042 [P] [US4] Unit test for loading state: `tests/unit/CourseList.test.tsx` - test skeleton display when isLoading=true
- [ ] T043 [US4] Integration test for loading UX: `tests/integration/loading-state.test.tsx` - search → see spinner → results arrive → spinner gone

### Implementation for User Story 4

- [ ] T044 [P] [US4] Create LoadingSkeleton component: `app/components/discover/LoadingSkeleton.tsx` showing 3 placeholder course cards
- [ ] T045 [US4] Update CourseList to show LoadingSkeleton when isLoading=true: `app/components/discover/CourseList.tsx`
- [ ] T046 [US4] Connect store.isLoading to CourseList - pass loading state from hook to component
- [ ] T047 [US4] Update API endpoint to set loading=true before fetch, false after response: `app/api/discover/search.tsx`
- [ ] T048 [US4] Test User Story 4 - verify loading skeleton appears and disappears correctly during search

**Checkpoint**: P1 stories + loading state. Improved UX feedback during search operations.

---

## Phase 7: User Story 5 - Shareable Search Results via URL (Priority: P2)

**Goal**: Search query persists in URL (e.g., ?search=Advanced+Python) enabling sharing and bookmarking

**Independent Test**:

1. Search "Advanced Python" → URL shows ?search=Advanced+Python
2. Copy URL, open in new tab → search box pre-filled, same results appear
3. Share URL with someone else → they see same results
4. Click browser back button → previous search or empty state returns

### Tests for User Story 5 ⚠️

- [ ] T049 [P] [US5] Unit test for URL sync: `tests/unit/useCourseSearch.test.ts` - test useSearchParams integration, URL updates on search
- [ ] T050 [US5] Integration test for URL sharing: `tests/integration/url-sharing.test.tsx` - search → copy URL → open in new context → verify same results

### Implementation for User Story 5

- [ ] T051 [US5] Update useCourseSearch hook to sync query with React Router searchParams: `app/hooks/useCourseSearch.ts`
- [ ] T052 [US5] Initialize search query from URL on page load - read ?search param in useEffect
- [ ] T053 [US5] Update URL searchParams when search completes (after debounce): setSearchParams({ search: query })
- [ ] T054 [US5] Clear URL param when search is cleared: setSearchParams({}) when clearSearch called
- [ ] T055 [US5] Test User Story 5 - share URLs work, back button works, URL pre-fills search box correctly

**Checkpoint**: Search URLs are shareable. Users can bookmark and return to searches. Browser history works intuitively.

---

## Phase 8: User Story 6 - Smooth Results Updates (Priority: P2)

**Goal**: Course list updates smoothly without full page reloads, preserving scroll position and page state

**Independent Test**:

1. Scroll down course list, search → page doesn't reload, scroll position maintained
2. Results change but no flash/flicker → smooth fade or transition
3. Search, then click on course → page state preserved (search state stays, URL kept)

### Tests for User Story 6 ⚠️

- [ ] T056 [P] [US6] Integration test for smooth updates: `tests/integration/smooth-updates.test.tsx` - search → verify no page reload, no position reset
- [ ] T057 [US6] Visual regression test for smooth transitions: `tests/visual/search-transitions.test.tsx` - test fade/slide animations on result updates

### Implementation for User Story 6

- [ ] T058 [P] [US6] Add CSS transitions to CourseList: `app/components/discover/CourseList.tsx` - fade in/out animations for results
- [ ] T059 [US6] Use React's key prop to prevent full re-render of courses: ensure course.id used as key
- [ ] T060 [US6] Verify no full page navigations in search hook - all updates via setResults (not page reload)
- [ ] T061 [US6] Test scroll position preservation - search while scrolled down, verify position maintained
- [ ] T062 [US6] Test User Story 6 - smooth transitions visible, no page reloads, state preserved

**Checkpoint**: All 6 user stories complete. Feature fully polished with smooth UX.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, documentation, security hardening

- [ ] T063 [P] Add comprehensive JSDoc comments to courseSearchStore: `app/stores/courseSearchStore.ts`
- [ ] T064 [P] Add JSDoc to useCourseSearch hook: `app/hooks/useCourseSearch.ts`
- [ ] T065 [P] Add JSDoc to backend searchCourses service: `app/services/course.server.ts`
- [ ] T066 [P] Update CourseSearchBar component with accessibility attributes: aria-label, role=searchbox, aria-busy during loading
- [ ] T067 [P] Update CourseList with accessibility - announce results count via aria-live region
- [ ] T068 [P] Add error boundary around search feature in discover route: `app/routes/discover.tsx`
- [ ] T069 [P] Add logging for search operations - log search queries (anonymized), API call times, error details
- [ ] T070 Verify all unit tests pass: `npm test`
- [ ] T071 Verify all integration tests pass: `npm test -- --grep integration`
- [ ] T072 Run TypeScript check: `npm run typecheck` - no type errors
- [ ] T073 Run linting: `npm run lint` - no linting issues
- [ ] T074 Run performance validation from quickstart.md - verify <100ms UI lag, <1s result delivery
- [ ] T075 Manual cross-browser testing: Test on Chrome, Firefox, Safari, Edge (desktop + mobile)
- [ ] T076 Update API documentation with endpoint examples: `docs/api-endpoints.md`
- [ ] T077 Add feature to CHANGELOG: Course discovery search with debouncing, URL persistence, smooth updates

**Checkpoint**: Production-ready. All tests pass, types valid, accessibility complete, documentation updated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately  
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories** ⚠️
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - **P1 Stories** (US1, US2, US3): Can proceed in parallel after Foundational
  - **P2 Stories** (US4, US5, US6): Can proceed in parallel after Foundational AND P1 completion (or after US1 if desired)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - NO dependencies on other stories  
- **User Story 2 (P1)**: Can start after Phase 2 - Independent from US1 (though builds on same components)  
- **User Story 3 (P1)**: Can start after Phase 2 - Independent from US1/US2  
- **User Story 4 (P2)**: Can start after Phase 2 + US1 complete (depends on search functionality working)
- **User Story 5 (P2)**: Can start after Phase 2 + US1 complete (depends on search functionality)
- **User Story 6 (P2)**: Can start after Phase 2 + US1 complete (depends on results displaying)

### Within Each User Story Task Order

1. **Tests first** (TXX1-TXX5): Write and ensure FAIL before implementation
2. **Models/State** (TXX6-TXX9): Create data structures
3. **Services/Hooks** (TXX10-TXX15): Implement business logic
4. **Components/Endpoints** (TXX16-TXX20): Wire everything together
5. **Validation & Testing** (TXX21-TXX24): Verify story works independently

### Parallel Opportunities

**Immediate parallel (can run simultaneously once previous phase completes)**:

1. **Phase 1 Setup** (T001-T003): All tasks independent

   ```
   T001: Database index migration
   T002: Copy contract types
   T003: Test fixtures
   ```

2. **Phase 2 Foundational** (T004-T010): Multiple parallel opportunities

   ```
   Parallel Group 1:
   - T004: Create Zustand store
   - T006: Create service
   - T007: Create endpoint
   - T008: Create contracts

   Parallel Group 2 (can run with Group 1):
   - T005: Create hook
   - T009: Error handling
   - T010: Store unit tests
   ```

3. **Phase 3-5 (P1 User Stories)** - Can proceed in parallel after Foundational:

   ```
   Developer A → User Story 1 (T011-T024)
   Developer B → User Story 2 (T025-T033)
   Developer C → User Story 3 (T034-T041)
   ```

4. **Within User Story 1** - Parallel test writing:

   ```
   - T011: Component input test
   - T012: Result filtering test
   - T013: API contract test
   - T014: Integration test
   - T015: Service test
   (all can be written simultaneously)
   ```

5. **Within User Story 1** - Parallel implementation:
   ```
   - T016: CourseSearchBar component
   - T017: Component logic
   - T020: Update CourseList
   (can be done in parallel, merged when ready)
   ```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

**Recommended for fastest delivery: 2-3 days solo or 1 day with team**

1.   Complete Phase 1: Setup (0.5 hours)
2.   Complete Phase 2: Foundational (4-5 hours) - **CRITICAL BLOCKER**
3.   Complete Phase 3: User Story 1 (4-5 hours)
4.   Complete Phase 4: User Story 2 (2-3 hours) - leverages Phase 2 hook
5.   Complete Phase 5: User Story 3 (1-2 hours)
6. **STOP and VALIDATE** at checkpoint - test all 3 stories independently  
7. Deploy/demo MVP to stakeholders
8. **Decide**: Continue with P2 stories or stop here?

**MVP Result**: Users can search courses with debouncing, clear search, and see results update smoothly. **Ready for production**.

### Incremental Delivery (Phases 3-8)

**For sustained value delivery: Add 1-2 features per sprint**

```
Sprint 1: Setup + Foundational + P1 Stories (Phases 1-5)
  ↓ Deploy: Basic search working  
Sprint 2: P2 Stories (Phases 6-7)
  ↓ Deploy: Loading states + URL sharing  
Sprint 3: P2 Final + Polish (Phase 8-9)
  ↓ Deploy: Smooth updates + full polish  
```

### Parallel Team Strategy

**With 3 developers for fastest execution: 1-1.5 days total**

```
Day 1 Morning:
- All: Phase 1 Setup together (0.5 hours)
- All: Phase 2 Foundational together (3-4 hours) → Foundation ready!

Day 1 Afternoon:
- Dev A: Phase 3 User Story 1 (4 hours)
- Dev B: Phase 4 User Story 2 (3 hours)
- Dev C: Phase 5 User Story 3 (2 hours)

Day 2 Morning:
- All: Merge, test, validate all 3 stories together  
- Decide: Ship MVP now or continue?

Day 2 Afternoon (optional):
- Dev A: Phase 6 User Story 4 (2 hours)
- Dev B: Phase 7 User Story 5 (2 hours)
- Dev C: Phase 8 User Story 6 (2 hours)

Day 2 End:
- All: Phase 9 Polish together (2 hours)
- All: Final validation, cross-browser testing  
```

---

## Success Validation Checklist

After completing each phase:

### After Phase 1  

- [ ] Migration file exists and can be applied
- [ ] Contract types accessible to components and backend
- [ ] Test fixtures load without errors

### After Phase 2  

- [ ] Zustand store initializes with correct state shape
- [ ] Hook compiles without errors
- [ ] Service function callable with test data
- [ ] Endpoint structure created and responds to requests
- [ ] Error handling works for invalid inputs

### After Phase 3 (MVP)  

- [ ] Type "Math" → see only Math courses
- [ ] All T011-T015 tests pass
- [ ] Empty query returns all courses
- [ ] Results display in real-time as you type

### After Phase 4  

- [ ] Type "Python" (6 chars) rapidly → exactly 1 API request in Network tab
- [ ] All T025-T027 tests pass
- [ ] Loading spinner appears during search

### After Phase 5  

- [ ] Search active → clear button visible and clickable
- [ ] Click clear → search box empty, all courses show, URL param gone
- [ ] All T034-T036 tests pass

### After Phase 6  

- [ ] Loading skeleton appears for 400ms+ while search in progress
- [ ] Skeleton disappears when results arrive

### After Phase 7  

- [ ] Search "JavaScript" → URL shows `?search=JavaScript`
- [ ] Copy URL to new tab → search box pre-filled, same results
- [ ] Browser back button returns to previous search or empty state

### After Phase 8  

- [ ] No page reloads during search (watch Network tab)
- [ ] Scroll position preserved while searching
- [ ] Results fade/transition smoothly

### After Phase 9  

- [ ] All tests pass: `npm test`
- [ ] Types valid: `npm run typecheck`
- [ ] Linting clean: `npm run lint`
- [ ] Accessibility: Tab through UI, all interactive elements reachable
- [ ] Cross-browser: Works on Chrome, Firefox, Safari
- [ ] Performance: <100ms UI lag, <1s result delivery
- [ ] Documentation updated

---

## Notes

- **[P]** marked tasks can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]** label maps tasks to specific user stories for traceability
- Each user story independently completable and testable per checkpoints
- Tests marked ⚠️ MUST fail before implementation begins (TDD approach)
- After each checkpoint, verify story works alone before moving to next
- Commit messages should reference task ID: "T016: Implement CourseSearchBar component"
- Core guideline: Don't move forward until current phase checkpoint passes

---

## Implementation Notes

### Technology Reminders

- **Frontend**: React 19, React Router v7, Zustand, Radix UI, Tailwind CSS
- **Backend**: Node.js, Express (via React Router action/loader), Prisma ORM
- **Database**: PostgreSQL with Prisma
- **Testing**: Vitest + React Testing Library, MSW for API mocking
- **API**: RESTful GET `/api/discover/search?query=...`

### File Paths Reference

- Services: `app/services/course.server.ts`
- API: `app/api/discover/search.tsx`
- Stores: `app/stores/courseSearchStore.ts`
- Hooks: `app/hooks/useCourseSearch.ts`
- Components: `app/components/discover/CourseSearchBar.tsx`, etc.
- Tests: `tests/unit/`, `tests/integration/`, `tests/fixtures/`
- Contracts: `app/contracts/search-api.ts`
- Database: `prisma/migrations/`

### Quick Start Commands

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run typecheck

# Linting
npm run lint

# Development server (already running)
npm run dev

# Database
npm run migrate:dev

# Build for production
npm run build
```

---

## Task Summary

- **Total Tasks**: 77 tasks
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 7 tasks
- **Phase 3 (US1 - Search)**: 14 tasks
- **Phase 4 (US2 - Debounce)**: 9 tasks
- **Phase 5 (US3 - Clear)**: 8 tasks
- **Phase 6 (US4 - Loading)**: 7 tasks
- **Phase 7 (US5 - URL Sharing)**: 7 tasks
- **Phase 8 (US6 - Smooth Updates)**: 7 tasks
- **Phase 9 (Polish)**: 15 tasks

**Estimated Effort**:

- Solo developer: 2-3 days
- Pair programming: 1.5-2 days
- 3-person team: 1-1.5 days

**MVP Scope** (P1 Stories only): 50 tasks, 1 day with team or 1.5 days solo
