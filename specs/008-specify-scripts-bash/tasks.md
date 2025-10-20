# Tasks: Sleek Course Enrollment UI

**Input**: Design documents from `/specs/008-specify-scripts-bash/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**Organization**: Tasks organized by user story to enable independent implementation and testing. Each story can be implemented and deployed independently.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of development environment

- [x] T001 Verify existing component structure and dependencies in `/app/components/ui/` directory
- [x] T002 Verify Tailwind CSS configuration and design system tokens in `tailwind.config.ts`
- [x] T003 [P] Verify i18n setup and existing translation structure in `app/locales/{en,zh}/course.json`
- [x] T004 [P] Review existing Prisma schema and database relationships in `prisma/schema.prisma`
- [x] T005 Verify Express API routing pattern in `app/api/` directory and error handling middleware
- [x] T006 [P] Setup feature branch checklist: Verify `.specify/templates/`, `CLAUDE.md` patterns, TypeScript strict mode

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create translation keys for course discovery in `app/locales/en/course.json` and `app/locales/zh/course.json` with keys: discovery.{title, empty, enroll, enrolled, classFull, students}
- [x] T008 Create Zod validation schema for enrollment requests in `app/schemas/enrollment.ts` with fields: classId (UUID), courseId (UUID), studentId (from auth context)
- [x] T009 Setup API response wrapper pattern and error types in `app/api/` directory, ensuring consistent success/error response format
- [x] T010 [P] Verify authentication middleware (`requireStudent`, `requireTeacher`) works correctly for route protection in `app/services/auth.server.ts`
- [x] T011 [P] Create TypeScript interfaces for DiscoverableCourse, CourseCard, and EnrollmentResponse in `app/types/course.ts`
- [x] T012 Verify Prisma client import path is correct: `app/generated/prisma/client` (check custom output configuration)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Redesigned Sleek Invitation Display (Priority: P1) 🎯 MVP

**Goal**: Redesign InvitationDisplay component from 2-column grid to sleek single-column centered layout with QR code prominence

**Independent Test**: Teacher generates invitation code, views course detail page, sees sleek centered layout with QR code (min 200x200px) prominently featured, code/URL in copyable fields, responsive down to 320px mobile width, dark mode works

### Implementation for User Story 1

- [x] T013 [US1] Modify InvitationDisplay component layout in `app/components/ui/invitation-display.tsx`: Change grid to flex column, center content, reorder QR code first
- [x] T014 [P] [US1] Update QR code wrapper with minimum 200x200px size constraint and descriptive text below in `app/components/ui/invitation-display.tsx`
- [x] T015 [P] [US1] Ensure copy-to-clipboard feedback (visual indication/toast) works for code field in `app/components/ui/copyable-field.tsx`
- [x] T016 [P] [US1] Ensure copy-to-clipboard feedback works for enrollment URL field in `app/components/ui/copyable-field.tsx`
- [x] T017 [US1] Test responsive layout at viewport sizes: 320px, 480px, 768px, 1024px, 1920px in `app/components/ui/invitation-display.tsx`
- [x] T018 [US1] Verify dark mode support: Test `dark:` classes render correctly with WCAG AA contrast ratios (4.5:1) in light/dark modes
- [x] T019 [US1] Apply design system colors: Use primary, secondary, and accent colors from `tailwind.config.ts` for interactive elements
- [x] T020 [US1] Add generous spacing/padding to match Card component styling in `app/components/ui/invitation-display.tsx`
- [x] T021 [US1] Manual QA: Navigate to `/teacher/courses/[courseId]`, generate invitation, verify layout matches spec acceptance criteria

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Student Course Discovery & Enrollment Page (Priority: P1)

**Goal**: Create dedicated course discovery page where students can browse all available courses and enroll with one click

**Independent Test**: Student navigates to `/student/courses/discover`, sees list of all available courses with teacher info/schedule/capacity, clicks Enroll successfully, page updates to show "Enrolled" badge, empty state shows when no courses, class full state prevents enrollment

### Implementation for User Story 2

- [x] T022 [US2] Create service function `getDiscoverableCourses()` in `app/services/course-discovery.server.ts` to fetch all active courses with active classes, include teacher info and enrollment counts
- [x] T023 [US2] Create service function `getStudentEnrolledCourses()` in `app/services/course-discovery.server.ts` to return Set of courseIds student is enrolled in
- [x] T024 [P] [US2] Create service function `createEnrollment()` in `app/services/course-discovery.server.ts` with validation: duplicate check, capacity check, active course/class check
- [x] T025 [P] [US2] Implement API endpoint GET `/api/courses/discover` in `app/api/courses/discover.ts`: query params (limit, offset, sort, search), return discoverable courses with pagination
- [x] T026 [P] [US2] Implement API endpoint POST `/api/enrollments` in `app/api/enrollments.ts`: create enrollment, validate input, return 201 Created or 409 Conflict errors
- [x] T027 [US2] Create React component `CourseDiscoveryContent` in `app/components/student/CourseDiscoveryContent.tsx` with course grid layout, card per course with teacher/schedule/capacity info
- [x] T028 [US2] Add course card CTA buttons to `CourseDiscoveryContent.tsx`: "Enroll", "Enrolled" (disabled), "Class Full" (disabled) button states based on enrollment status
- [x] T029 [US2] Add empty state to `CourseDiscoveryContent.tsx`: friendly message with icon when no courses available
- [x] T030 [US2] Create route loader in `app/routes/student/courses/discover.tsx` to fetch discoverable courses and student's enrolled course IDs
- [x] T031 [US2] Create route action in `app/routes/student/courses/discover.tsx` to handle POST enrollment requests, redirect or show success toast
- [x] T032 [US2] Add loading states and error handling to `app/routes/student/courses/discover.tsx`: loading spinners, error messages from enrollment failures
- [x] T033 [US2] Implement form submission debouncing in `CourseDiscoveryContent.tsx` to prevent duplicate enrollment on rapid clicks
- [x] T034 [US2] Test responsive layout: course cards should display correctly at 320px (1 col), 768px (2 cols), 1024px (3+ cols)
- [x] T035 [US2] Verify dark mode: course cards use consistent colors with design system tokens, maintain WCAG AA contrast
- [x] T036 [US2] Add page header with title using `PageHeader` component in `app/routes/student/courses/discover.tsx`
- [x] T037 [US2] Manual QA: Navigate to `/student/courses/discover`, see courses, enroll in one, verify success state, test empty state, test capacity full state

**Checkpoint**: User Stories 1 and 2 are complete and independently functional

---

## Phase 5: User Story 3 - Consistent Visual Design Across Platform (Priority: P1)

**Goal**: Ensure new components seamlessly integrate with existing application design using consistent colors, typography, spacing

**Independent Test**: New InvitationDisplay and CourseDiscoveryContent components use same colors/typography/spacing as existing pages (course management, student dashboard); dark mode works; WCAG AA contrast verified

### Implementation for User Story 3

- [x] T038 [US3] Audit existing design system tokens: Document primary, secondary, accent, muted colors from `tailwind.config.ts` and CSS variables
- [x] T039 [US3] Audit existing Button component styling in `app/components/ui/button.tsx`: height, padding, font-size, hover states, active states
- [x] T040 [US3] Audit existing Card component styling in `app/components/ui/card.tsx`: border-radius, shadow, padding, background colors
- [x] T041 [US3] Audit existing typography: heading sizes, weights, letter-spacing from component examples
- [x] T042 [US3] Verify InvitationDisplay uses same button styles as existing buttons (primary/secondary variants)
- [x] T043 [US3] Verify InvitationDisplay uses same Card styling as assignment cards and course cards
- [x] T044 [US3] Verify CourseDiscoveryContent course cards use same Card, Button styling as existing components
- [x] T045 [US3] Verify heading typography in both components matches existing h2/h3 sizes and weights
- [x] T046 [US3] Verify description/label text uses same muted-foreground color and text-sm size as existing components
- [x] T047 [US3] Test light mode: Run contrast check on all text elements (should be ≥4.5:1 for normal text, ≥3:1 for large)
- [x] T048 [US3] Test dark mode: Verify color inversion works correctly, re-check contrast ratios with dark background
- [x] T049 [US3] Verify spacing consistency: padding between sections, gap between elements matches existing Card/Button spacing patterns
- [x] T050 [US3] Verify border-radius: course cards and components use same `rounded-lg` or consistent `var(--radius)` value
- [x] T051 [US3] Manual QA: Compare new components side-by-side with existing pages on desktop, tablet, mobile in both light and dark modes

**Checkpoint**: All visual design requirements met, components integrate seamlessly with existing UI

---

## Phase 6: User Story 4 - Database Infrastructure for Course Discoverability (Priority: P2)

**Goal**: Ensure database efficiently supports course discovery queries and enrollment with proper constraints

**Independent Test**: `getDiscoverableCourses()` returns all active courses with active classes in <2 seconds; `createEnrollment()` prevents duplicates and respects capacity atomically; database constraints enforce data integrity

### Implementation for User Story 4

- [x] T052 [US4] Review Prisma schema for Course, Class, Enrollment relationships in `prisma/schema.prisma`
- [x] T053 [US4] Verify unique constraint exists on `(studentId, classId)` in Enrollment model to prevent duplicates
- [x] T054 [US4] Verify foreign keys and cascading deletes are configured correctly in schema
- [x] T055 [US4] Verify _count fields work in Prisma queries for enrollment counts in `app/services/course-discovery.server.ts`
- [x] T056 [US4] Create test database query: fetch all courses with isActive=true AND has active classes, verify result set is correct
- [x] T057 [US4] Create test database query: check duplicate enrollment prevention when inserting same (studentId, classId) twice
- [x] T058 [US4] Create test database query: verify capacity validation works when enrollment count >= class.capacity
- [x] T059 [US4] Performance test: Run discovery query with 1000+ courses, verify completes in <2 seconds (add indexes if needed)
- [x] T060 [US4] Test race condition scenario: simulate two simultaneous enrollment requests to same class at capacity, verify only one succeeds
- [x] T061 [US4] Document performance characteristics of key queries in `app/services/course-discovery.server.ts` comments

**Checkpoint**: Database infrastructure is robust and performant

---

## Phase 7: Integration & Cross-Story Testing

**Purpose**: Verify all user stories work together correctly

- [x] T062 [P] Run complete end-to-end flow: Teacher creates course → Teacher generates invitation → Student discovers course → Student enrolls → Verify enrollment persists
- [x] T063 [P] Test error scenarios: Duplicate enrollment attempt, class full enrollment, inactive course enrollment, non-existent class enrollment
- [x] T064 [P] Test concurrent operations: Multiple students enrolling in same course simultaneously, verify no duplicates or capacity violations
- [x] T065 Verify i18n keys work in all new components: Check translations render correctly for both EN and ZH locales
- [x] T066 Test accessibility: Tab navigation through discovery page, screen reader testing on course cards and buttons
- [x] T067 Test mobile experience: Touch interactions, button sizing, responsive layout at 320px width

**Checkpoint**: All components integrated and working together ✓ COMPLETE

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting all user stories, documentation, and final validation

- [x] T068 [P] Add JSDoc comments to all service functions in `app/services/course-discovery.server.ts` with parameter descriptions and return types
- [x] T069 [P] Add comprehensive error messages to enrollment failures (duplicate, full, inactive) for user-friendly feedback
- [x] T070 [P] Add logging for key operations: course discovery queries, enrollment attempts, validation failures in `app/services/course-discovery.server.ts`
- [x] T071 Add success toast notifications for successful enrollment in `app/routes/student/courses/discover.tsx` using existing toast component
- [x] T072 Update project README or docs to document new routes: GET `/api/courses/discover`, POST `/api/enrollments`, `/student/courses/discover`
- [x] T073 Code cleanup: Remove commented code, ensure consistent formatting, verify no console.logs remain
- [x] T074 [P] Run type checking: `npm run typecheck` to verify all TypeScript types are correct across new files
- [x] T075 [P] Run linting: `npm run lint` and `npm run lint:fix` to ensure code style matches project conventions
- [x] T076 Performance audit: Check bundle size impact of new components, optimize if needed
- [x] T077 Run quickstart.md validation checklist to verify all requirements met
- [x] T078 Final manual testing: Full end-to-end flows on desktop, tablet, mobile in light and dark modes
- [x] T079 Prepare release notes documenting new course discovery feature for users

**Checkpoint**: Feature ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS** all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (Invitation Display): Can start after Foundational
  - User Story 2 (Course Discovery): Can start after Foundational, no dependencies on US1
  - User Story 3 (Visual Design): Should run parallel with US1 and US2, focuses on consistency
  - User Story 4 (Database): Can start after Foundational, supports US2
- **Integration (Phase 7)**: Depends on US1, US2, US3, US4 completion
- **Polish (Phase 8)**: Depends on Integration phase completion

### User Story Completion Order

**MVP Approach** (Launch after Phase 1-3):
1. Setup (Phase 1)
2. Foundational (Phase 2)
3. User Story 1 (Phase 3) - InvitationDisplay Redesign
4. **STOP and VALIDATE**: Test US1 independently
5. **DEPLOY MVP** (InvitationDisplay improvement only)

**Full Feature Approach** (All user stories):
1. Setup → Foundational → All user stories in parallel → Integration → Polish
2. User Story 1: Invitation Display (3-5 hours)
3. User Story 2: Course Discovery (6-8 hours)
4. User Story 3: Visual Design (2-3 hours, runs parallel with 1-2)
5. User Story 4: Database Infrastructure (2-3 hours, done by Phase 2 or early Phase 3)

### Parallel Opportunities

**Phase 1 Setup**:
- T003, T004, T005, T006 all marked [P] - can run simultaneously

**Phase 2 Foundational**:
- T010, T011 marked [P] - create translations and schema in parallel with other tasks
- T003, T004, T005, T006 from Setup can all run in parallel

**User Story 1 (Invitation Display)**:
- T014, T015, T016 marked [P] - all UI updates can be coded in parallel
- T018 (dark mode) can be verified while layout is being finalized

**User Story 2 (Course Discovery)**:
- T022, T023, T024 marked [P] - all service functions can be created in parallel
- T025, T026 marked [P] - API endpoints can be implemented in parallel
- Once services done, T027-T035 (React component and route) can follow

**Team Execution Example (3 developers)**:
```
Developer A:
  - Phase 1-2: Setup & Foundational
  - Phase 3: User Story 1 (Invitation Display) - 3-5 hours

Developer B:
  - Phase 2 (parallel with A): Help with Foundational if needed
  - Phase 3 (parallel with A): Start User Story 2 backend (T022-T026) while A does US1

Developer C:
  - Phase 2 (parallel): Help with Foundational if needed
  - Phase 3 (parallel): Start User Story 2 frontend (T027-T035) after services from B ready

After Phase 3:
  - All developers: Phase 7 (Integration & Testing)
  - Then Phase 8 (Polish)
```

---

## Implementation Strategy

### MVP First (Recommended - 1-2 days)

1. Complete Phase 1: Setup (1-2 hours)
2. Complete Phase 2: Foundational (1-2 hours)
3. Complete Phase 3: User Story 1 (InvitationDisplay) (3-5 hours)
4. **STOP and VALIDATE**: Deploy MVP with just InvitationDisplay redesign
5. Get user feedback before proceeding to Discovery feature

### Full Feature (4-5 days)

1. Complete Setup + Foundational (2-4 hours)
2. Complete User Story 1-4 in parallel or sequence (14-20 hours)
3. Complete Integration testing (1-2 hours)
4. Complete Polish & final validation (1-2 hours)
5. Deploy full feature suite

### Recommended Execution Path

**Day 1 Morning**:
- Complete Phase 1 (Setup)
- Complete Phase 2 (Foundational)

**Day 1 Afternoon**:
- Start Phase 3 (User Story 1: Invitation Display)
- Dev B: Start Phase 4 backend (User Story 2 services)

**Day 2 Morning**:
- Finish Phase 3 (US1)
- Dev C: Start Phase 4 frontend (User Story 2 component)
- Dev B: Start Phase 6 (Database infrastructure validation)

**Day 2 Afternoon**:
- All: Phase 7 (Integration testing)
- Manual QA on real device/mobile

**Day 3 Morning**:
- Phase 8 (Polish & final validation)
- Release preparation

---

## Success Criteria Mapping

Each task maps to Feature Specification success criteria (SC-001 through SC-009):

| Task Group | Maps to Success Criteria |
|-----------|------------------------|
| T013-T021 (US1) | SC-001 (space reduction), SC-008 (QR code), SC-004 (contrast) |
| T022-T037 (US2) | SC-002 (3 clicks), SC-003 (<2s load), SC-007 (instant update) |
| T038-T051 (US3) | SC-006 (100% consistency), SC-004 (WCAG AA), SC-005 (responsive) |
| T052-T061 (US4) | SC-003 (performance), SC-009 (no duplicates) |

---

## Notes & Guidelines

- **[P] Marker**: Task can run in parallel (uses different files, no dependencies on incomplete tasks)
- **[Story] Label**: Maps task to specific user story (US1, US2, US3, US4) for traceability
- **File Paths**: All paths are absolute from repository root (`/app/`, `/prisma/`, etc.)
- **Checklist Format**: Every task MUST be independently actionable - no additional context needed
- **Testing**: Tests are optional - only included where critical for data integrity and API contracts
- **Commits**: Recommend committing after completing each task or logical group (e.g., after T013-T021)
- **Validation**: After each phase completes, review checkpoints before proceeding to next phase
- **Rollback**: If any task fails, fix before moving to dependent tasks

---

## Estimated Timeline

| Phase | Tasks | Hours | Notes |
|-------|-------|-------|-------|
| Phase 1: Setup | T001-T006 | 1-2 | Verification tasks, mostly quick checks |
| Phase 2: Foundational | T007-T012 | 1-2 | Create schemas, config, interfaces |
| Phase 3: User Story 1 | T013-T021 | 3-5 | InvitationDisplay redesign |
| Phase 4: User Story 2 | T022-T037 | 6-8 | Services, API endpoints, components |
| Phase 5: User Story 3 | T038-T051 | 2-3 | Visual audit and consistency verification |
| Phase 6: User Story 4 | T052-T061 | 2-3 | Database query validation and performance |
| Phase 7: Integration | T062-T067 | 1-2 | E2E testing and accessibility |
| Phase 8: Polish | T068-T079 | 2-3 | Documentation, cleanup, final validation |
| **TOTAL** | **79 tasks** | **20-30 hours** | 2-3 developers, 3-5 days |

---

## Quick Reference

**For this sprint, focus on**:
1. ✅ Phase 1-2 (Setup & Foundational) - Foundation must be solid
2. ✅ Phase 3 (User Story 1) - MVP launchable feature
3. ✅ Phase 7 (Integration) - Make sure everything works together
4. Defer Phase 8 (Polish) to next sprint if time-constrained

**Always start with**:
- Read spec.md acceptance criteria for each user story
- Review design documents in contracts/ before coding
- Write failing tests first if TDD approach desired
- Commit frequently with clear messages

