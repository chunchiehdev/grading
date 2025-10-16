# Tasks: Unify Form Layout Patterns

**Input**: Design documents from `/specs/001-unify-form-layouts/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in feature specification - no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `app/` at repository root (React Router v7 architecture)
- Components: `app/components/forms/`
- Routes: `app/routes/teacher/`
- Paths below use absolute paths from project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the three reusable layout components that all forms will use

**Duration**: ~2-3 hours

- [x] T001 Create directory structure for form components at app/components/forms/
- [x] T002 [P] Create FormPageLayout component in app/components/forms/FormPageLayout.tsx with TypeScript interface
- [x] T003 [P] Create FormSection component in app/components/forms/FormSection.tsx with TypeScript interface
- [x] T004 [P] Create FormActionButtons component in app/components/forms/FormActionButtons.tsx with TypeScript interface
- [x] T005 Create barrel export file at app/components/forms/index.ts exporting all three components

**Checkpoint**: All three layout components created and exportable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Duration**: ~1-2 hours

- [x] T006 Implement FormPageLayout with centered header, responsive container, and semantic tokens in app/components/forms/FormPageLayout.tsx
- [x] T007 Implement FormSection with card styling (rounded-2xl shadow-sm), responsive padding, and optional title/icon in app/components/forms/FormSection.tsx
- [x] T008 Implement FormActionButtons with flex layout (flex-col sm:flex-row), blue submit button, and loading state support in app/components/forms/FormActionButtons.tsx
- [x] T009 Verify all three components use only semantic color tokens (bg-background, bg-card, text-foreground, etc.) with no hard-coded colors except blue submit button

**Checkpoint**: Foundation ready - all layout components fully functional and ready for form migration

---

## Phase 3: User Story 1 - Consistent Visual Experience Across Creation Forms (Priority: P1) 🎯 MVP

**Goal**: Establish structural consistency across all creation forms with identical header layouts, card styling, button placement, and spacing patterns

**Independent Test**: Navigate to any two "new" form pages (e.g., `/teacher/courses/new` and `/teacher/courses/:id/assignments/new`) and verify identical header layout, card styling, button placement, and spacing patterns without checking other forms.

**Why MVP**: This is the foundation for all form consistency. Completing P1 delivers immediate visual consistency value and establishes the pattern for P2/P3.

**Duration**: ~4-6 hours

### Acceptance Criteria Mapping

- AC1: Centered headers with identical title/subtitle styling
- AC2: All form cards use identical rounded corners, padding, shadow, background colors
- AC3: Cancel and Submit buttons with identical sizes, colors, spacing, layout
- AC4: Semantic color tokens correctly applied for light/dark mode

### Implementation Tasks

- [x] T010 [P] [US1] Migrate app/routes/teacher/courses/new.tsx to use FormPageLayout wrapper (AC1)
- [x] T011 [P] [US1] Migrate app/routes/teacher/courses/$courseId/classes/new.tsx to use FormPageLayout wrapper (AC1)
- [x] T012 [P] [US1] Migrate app/routes/teacher/courses/new.tsx form sections to use FormSection components (AC2)
- [x] T013 [P] [US1] Migrate app/routes/teacher/courses/$courseId/classes/new.tsx form sections to use FormSection components (AC2)
- [x] T014 [P] [US1] Replace action buttons in app/routes/teacher/courses/new.tsx with FormActionButtons component (AC3)
- [x] T015 [P] [US1] Replace action buttons in app/routes/teacher/courses/$courseId/classes/new.tsx with FormActionButtons component (AC3)
- [x] T016 [US1] Verify semantic token usage (bg-card, text-foreground, etc.) in app/routes/teacher/courses/new.tsx - remove any hard-coded colors (AC4)
- [x] T017 [US1] Verify semantic token usage in app/routes/teacher/courses/$courseId/classes/new.tsx - remove any hard-coded colors (AC4)
- [x] T018 [US1] Update form spacing to use standard pattern (space-y-6 lg:space-y-8 xl:space-y-10) in both migrated forms (AC2)

**Checkpoint**: At this point, courses/new.tsx and classes/new.tsx should have identical structural layouts. Navigate between them to verify visual consistency.

---

## Phase 4: User Story 1 (continued) - Migrate Complex Forms

**Goal**: Apply P1 structural consistency to assignment and rubric forms (more complex cases)

**Duration**: ~3-4 hours

### Implementation Tasks

- [x] T019 [US1] Migrate app/routes/teacher/courses/$courseId/assignments/new.tsx from PageHeader to FormPageLayout centered header pattern (AC1)
- [x] T020 [US1] Wrap form sections in app/routes/teacher/courses/$courseId/assignments/new.tsx with FormSection components (AC2)
- [x] T021 [US1] Replace action buttons in app/routes/teacher/courses/$courseId/assignments/new.tsx with FormActionButtons component (AC3)
- [x] T022 [US1] Remove PageHeader import and adjust any PageHeader-specific styling in app/routes/teacher/courses/$courseId/assignments/new.tsx
- [x] T023 [US1] Migrate app/routes/teacher/rubrics/new.tsx outer structure to use FormPageLayout (preserve internal complexity) (AC1)
- [x] T024 [US1] Wrap top-level cards in app/routes/teacher/rubrics/new.tsx with FormSection (Basic Info, Categories, Criteria sections) (AC2)
- [x] T025 [US1] Update rubric header action buttons (Preview, Save) to match FormActionButtons styling (keep custom placement) (AC3)
- [x] T026 [US1] Verify semantic tokens throughout app/routes/teacher/rubrics/new.tsx - no hard-coded colors except blue buttons (AC4)

**Checkpoint**: All four creation forms now use FormPageLayout, FormSection, and consistent button styling. Structural consistency (P1) is complete.

---

## Phase 5: User Story 2 - Unified Form Field Styling (Priority: P2)

**Goal**: Ensure all input fields, labels, and form controls have consistent styling and behavior across all forms

**Independent Test**: Compare any two forms side-by-side and verify input heights, label text sizes, border radius, focus states, and placeholder text styling match exactly across all field types.

**Duration**: ~3-4 hours

### Acceptance Criteria Mapping

- AC1: Text inputs use identical height (h-11 sm:h-12 lg:h-14 xl:h-16), rounded corners (rounded-xl), text sizes (text-base lg:text-lg xl:text-xl)
- AC2: Select dropdowns and date pickers maintain consistent styling with inputs
- AC3: Labels use identical text sizing (text-base lg:text-lg xl:text-xl), font weight (font-medium), color (text-foreground)
- AC4: Required field indicators (red asterisk) consistently placed and styled

### Implementation Tasks

- [x] T027 [P] [US2] Standardize all Input fields in app/routes/teacher/courses/new.tsx with className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl" (AC1)
- [x] T028 [P] [US2] Standardize all Input fields in app/routes/teacher/courses/$courseId/classes/new.tsx with standard className (AC1)
- [x] T029 [P] [US2] Standardize all Input fields in app/routes/teacher/courses/$courseId/assignments/new.tsx with standard className (AC1)
- [x] T030 [P] [US2] Standardize all Input fields in app/routes/teacher/rubrics/new.tsx with standard className (AC1)
- [x] T031 [P] [US2] Standardize all Textarea fields across all four forms with className="rounded-xl text-base lg:text-lg xl:text-xl" (AC1)
- [x] T032 [P] [US2] Verify Select components in app/routes/teacher/courses/$courseId/assignments/new.tsx use className="bg-background border-border" (AC2)
- [x] T033 [P] [US2] Verify DatePicker components maintain consistent styling with Input fields (AC2)
- [x] T034 [P] [US2] Standardize all Label components across all four forms with className="text-base lg:text-lg xl:text-xl font-medium text-foreground" (AC3)
- [x] T035 [US2] Ensure required field asterisks use consistent className="text-red-500" placement (after label text) across all forms (AC4)
- [x] T036 [US2] Verify icon-enhanced labels use className="flex items-center gap-2" with icon className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" (AC3)

**Checkpoint**: All input fields, labels, and form controls now have identical styling across all four forms. Field-level consistency (P2) is complete.

---

## Phase 6: User Story 3 - Responsive Layout Consistency (Priority: P3)

**Goal**: Ensure all creation forms adapt to screen sizes identically with uniform breakpoint behavior

**Independent Test**: View any single form on mobile (< 640px), tablet (768px), and desktop (1280px+) viewports and verify it follows the same breakpoint behavior as other forms.

**Duration**: ~2-3 hours

### Acceptance Criteria Mapping

- AC1: All forms use identical max-width constraints (max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl) and padding (px-4 sm:px-6 lg:px-8)
- AC2: Action buttons transition from stacked (flex-col) to side-by-side (sm:flex-row) at the same breakpoint
- AC3: Page headers use identical text scaling (text-3xl sm:text-4xl lg:text-5xl xl:text-6xl for titles)
- AC4: Form sections maintain identical vertical spacing that scales with viewport (space-y-6 lg:space-y-8 xl:space-y-10)

### Implementation Tasks

- [x] T037 [US3] Verify FormPageLayout component enforces correct container max-width (max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl) and padding (px-4 sm:px-6 lg:px-8) (AC1)
- [x] T038 [US3] Verify FormActionButtons component uses flex-col sm:flex-row with gap-3 sm:gap-4 lg:gap-5 xl:gap-6 (AC2)
- [x] T039 [US3] Verify FormPageLayout title uses text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight (AC3)
- [x] T040 [US3] Verify FormPageLayout subtitle uses text-base lg:text-lg xl:text-xl text-muted-foreground (AC3)
- [x] T041 [US3] Audit all four forms to ensure Form wrapper uses className="space-y-6 lg:space-y-8 xl:space-y-10" (AC4)
- [x] T042 [US3] Verify FormSection component applies responsive padding (p-5 sm:p-6 lg:p-8 xl:p-10) and internal spacing (space-y-5 lg:space-y-6) (AC4)
- [x] T043 [US3] Test app/routes/teacher/courses/new.tsx at 375px, 768px, 1280px viewports - verify consistent behavior (AC1, AC2, AC3, AC4)
- [x] T044 [US3] Test app/routes/teacher/courses/$courseId/classes/new.tsx at 375px, 768px, 1280px viewports - verify consistent behavior (AC1, AC2, AC3, AC4)
- [x] T045 [US3] Test app/routes/teacher/courses/$courseId/assignments/new.tsx at 375px, 768px, 1280px viewports - verify consistent behavior (AC1, AC2, AC3, AC4)
- [x] T046 [US3] Test app/routes/teacher/rubrics/new.tsx at 375px, 768px, 1280px viewports - verify consistent behavior (AC1, AC2, AC3, AC4)

**Checkpoint**: All forms respond to viewport changes identically. Responsive consistency (P3) is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and quality assurance across all user stories

**Duration**: ~2-3 hours

- [x] T047 [P] Verify light mode rendering for all four forms - check semantic token application and color contrast
- [x] T048 [P] Verify dark mode rendering for all four forms - toggle theme and check all colors adapt correctly
- [x] T049 [P] Remove any unused className constants or commented-out code from migrated forms
- [x] T050 Run Prettier formatting on all modified files (app/components/forms/\*, app/routes/teacher/courses/new.tsx, app/routes/teacher/courses/$courseId/classes/new.tsx, app/routes/teacher/courses/$courseId/assignments/new.tsx, app/routes/teacher/rubrics/new.tsx)
- [x] T051 Verify all existing form functionality still works - submit each form and check validation, error handling, navigation
- [x] T052 Test form submission for app/routes/teacher/courses/new.tsx - verify no regression in create course flow
- [x] T053 Test form submission for app/routes/teacher/courses/$courseId/classes/new.tsx - verify no regression in create class flow
- [x] T054 Test form submission for app/routes/teacher/courses/$courseId/assignments/new.tsx - verify no regression in create assignment flow
- [x] T055 Test form submission for app/routes/teacher/rubrics/new.tsx - verify no regression in create rubric flow (including complex category/criteria interactions)
- [x] T056 Verify error alerts display correctly on all forms (trigger validation errors and check Alert component styling)
- [x] T057 Verify loading states work correctly when forms are submitting (check FormActionButtons isLoading prop)
- [x] T058 Review specs/001-unify-form-layouts/quickstart.md and ensure all examples match actual implementation
- [x] T059 Take screenshots of all four forms in light mode at desktop viewport (1280px+) for documentation
- [x] T060 Take screenshots of all four forms in dark mode at desktop viewport (1280px+) for documentation
- [x] T061 Run ESLint on modified files and fix any linting errors introduced during refactor

**Checkpoint**: Feature is complete, all forms are consistent, and all existing functionality is preserved.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User Story 1 (Phases 3-4): Can start after Foundational
  - User Story 2 (Phase 5): Can start after Foundational (independent of US1 but logically follows)
  - User Story 3 (Phase 6): Can start after Foundational (independent but best done after US1/US2)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Logically builds on US1 structural changes but technically independent
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Validates responsive behavior established by US1/US2

### Recommended Sequential Order

Since this is a refactoring effort with high interdependence:

1. **Phase 1**: Setup (2-3 hours) → Create component files
2. **Phase 2**: Foundational (1-2 hours) → Implement components
3. **Phase 3**: User Story 1 Part 1 (4-6 hours) → Migrate simple forms (courses, classes)
4. **Phase 4**: User Story 1 Part 2 (3-4 hours) → Migrate complex forms (assignments, rubrics)
5. **Phase 5**: User Story 2 (3-4 hours) → Standardize field styling
6. **Phase 6**: User Story 3 (2-3 hours) → Verify responsive behavior
7. **Phase 7**: Polish (2-3 hours) → Test, verify, clean up

**Total Estimated Time**: 17-25 hours

### Within Each User Story

- **Phase 3-4 (US1)**: Forms can be migrated in parallel (T010-T015 are all [P]), but sequential migration (courses → classes → assignments → rubrics) is safer for a refactor
- **Phase 5 (US2)**: Field standardization tasks are all [P] and can run in parallel across different forms
- **Phase 6 (US3)**: Responsive verification tasks are sequential (verify component implementation, then test each form)

### Parallel Opportunities

**Within Setup (Phase 1)**:

- T002, T003, T004 can run in parallel (different files)

**Within Foundational (Phase 2)**:

- T006, T007, T008 are sequential (implement one component at a time for quality)

**Within User Story 1 (Phases 3-4)**:

```bash
# Can run in parallel (different files):
T010: app/routes/teacher/courses/new.tsx
T011: app/routes/teacher/courses/$courseId/classes/new.tsx
T019: app/routes/teacher/courses/$courseId/assignments/new.tsx
T023: app/routes/teacher/rubrics/new.tsx
```

**Within User Story 2 (Phase 5)**:

```bash
# All field standardization tasks can run in parallel:
T027: courses/new.tsx inputs
T028: classes/new.tsx inputs
T029: assignments/new.tsx inputs
T030: rubrics/new.tsx inputs
T031: all textareas
T034: all labels
```

**Within Polish (Phase 7)**:

- T047, T048, T049 can run in parallel (different concerns)

---

## Parallel Example: User Story 1 (Phase 3)

```bash
# If you have multiple developers, launch these migrations in parallel:

Developer A: "Migrate app/routes/teacher/courses/new.tsx to use FormPageLayout wrapper"
Developer A: "Migrate app/routes/teacher/courses/new.tsx form sections to use FormSection components"
Developer A: "Replace action buttons in app/routes/teacher/courses/new.tsx with FormActionButtons component"

Developer B: "Migrate app/routes/teacher/courses/$courseId/classes/new.tsx to use FormPageLayout wrapper"
Developer B: "Migrate app/routes/teacher/courses/$courseId/classes/new.tsx form sections to use FormSection components"
Developer B: "Replace action buttons in app/routes/teacher/courses/$courseId/classes/new.tsx with FormActionButtons component"
```

**Note**: For a refactoring project, sequential execution is recommended to catch issues early and avoid merge conflicts in shared components.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create layout components)
2. Complete Phase 2: Foundational (implement layout components)
3. Complete Phase 3: User Story 1 Part 1 (migrate courses/classes forms)
4. **STOP and VALIDATE**:
   - Navigate between courses/new and classes/new
   - Verify identical header, card, button styling
   - Test light/dark mode
   - Test form submission (no regression)
5. If validated, optionally deploy/demo structural consistency

**MVP Delivers**: Two forms (courses, classes) with perfect visual consistency, demonstrating the pattern works.

### Incremental Delivery

1. **Milestone 1**: Foundation + US1 Part 1 → Courses and Classes forms consistent (MVP!)
2. **Milestone 2**: US1 Part 2 → Add Assignments and Rubrics forms to consistency pattern
3. **Milestone 3**: US2 → All fields styled identically across all forms
4. **Milestone 4**: US3 → Responsive behavior verified and consistent
5. **Milestone 5**: Polish → All edge cases handled, feature complete

Each milestone can be independently validated and potentially deployed.

### Single Developer Strategy

Recommended sequential order (lowest risk):

1. Phases 1-2: Setup and implement components (3-5 hours)
2. Phase 3: Migrate simple forms first - courses, classes (4-6 hours)
   - **Validate**: Test both forms, verify consistency
3. Phase 4: Migrate complex forms - assignments, rubrics (3-4 hours)
   - **Validate**: Test all four forms, verify structural consistency
4. Phase 5: Standardize field styling across all forms (3-4 hours)
   - **Validate**: Compare fields side-by-side, verify exact matching
5. Phase 6: Verify responsive behavior (2-3 hours)
   - **Validate**: Test at multiple viewports, verify consistent breakpoints
6. Phase 7: Polish and final QA (2-3 hours)
   - **Validate**: Full regression test of all forms

**Total**: 17-25 hours of focused work

---

## Success Validation Checklist

After completing all tasks, verify against success criteria from spec.md:

- [ ] SC-001: Can you visually identify all four forms as part of the same design system? (qualitative check)
- [ ] SC-002: Do all forms use identical container widths, card styling, and button dimensions? (visual inspection + code review)
- [ ] SC-003: Are all forms using semantic tokens only (no hard-coded colors except blue submit button)? (code audit)
- [ ] SC-004: Do all forms display identically on mobile viewport (375px-640px)? (viewport testing)
- [ ] SC-005: Do all forms display identically on desktop viewport (1280px+)? (viewport testing)
- [ ] SC-006: Do all input fields have identical dimensions at each breakpoint? (side-by-side comparison)
- [ ] SC-007: Does all existing form functionality still work? (submit all forms, test validation)
- [ ] SC-008: Is it easier to understand any form due to familiar layout? (qualitative user feedback)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel if staffed
- **[Story] label**: Maps task to specific user story (US1/US2/US3) for traceability
- **Refactoring caution**: Even though tasks are marked [P], sequential execution reduces merge conflicts
- **Checkpoint validation**: Stop after each phase to verify no regressions introduced
- **Commit frequently**: Commit after each form migration (T010-T015, T019-T026, etc.)
- **Avoid**: Changing multiple forms simultaneously without testing each one
- **Emergency rollback**: Each phase should be a separate commit for easy revert

**Key Insight**: This is a layout refactor, not new feature development. Preserve all existing functionality while updating only visual/structural aspects.
