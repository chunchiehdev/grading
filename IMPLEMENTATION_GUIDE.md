# Implementation Guide: Sleek Course Enrollment UI

**Feature**: Sleek Course Enrollment UI
**Branch**: `008-specify-scripts-bash`
**Total Tasks**: 79
**Estimated Effort**: 20-30 hours
**Team**: 2-3 developers
**Timeline**: 3-5 days

---

## 📋 Implementation Checklist Status

✅ **All Specification Checklists**: COMPLETE
- Requirements quality checklist: 22/22 items ✓

✅ **All Planning Documents**: READY
- `spec.md`: Feature specification (37 FRs, 4 user stories, 9 success criteria)
- `plan.md`: Implementation plan (technical context, architecture)
- `data-model.md`: Database design (5 entities, query patterns)
- `contracts/`: API specifications (2 endpoints, full request/response)
- `quickstart.md`: Developer quick start (code templates)
- `tasks.md`: Task list (79 actionable tasks, 8 phases)

---

## 🚀 Quick Start: How to Execute

### Option A: Full Team Handoff (Recommended)

1. **Clone the feature branch**:
   ```bash
   git checkout 008-specify-scripts-bash
   ```

2. **Share these documents with your team**:
   - `/home/chunc/workspace/grading/specs/008-specify-scripts-bash/tasks.md` ← START HERE
   - `/home/chunc/workspace/grading/specs/008-specify-scripts-bash/plan.md`
   - `/home/chunc/workspace/grading/specs/008-specify-scripts-bash/spec.md`
   - `/home/chunc/workspace/grading/specs/008-specify-scripts-bash/data-model.md`
   - `/home/chunc/workspace/grading/specs/008-specify-scripts-bash/contracts/`

3. **Follow the execution plan** (from tasks.md):
   - Phase 1-2: Setup & Foundational (2-4 hours) - Foundation
   - Phase 3: User Story 1 (3-5 hours) - MVP
   - Phase 4-6: User Stories 2-4 (parallel) - Full feature
   - Phase 7-8: Integration & Polish (3-5 hours) - Production-ready

4. **Track progress**: Check off tasks in `tasks.md` as completed

5. **Deploy**: MVP ready after Phase 3; Full feature ready after Phase 8

---

## 📊 Task Phases Overview

### Phase 1: Setup (1-2 hours) - 6 tasks
**Files affected**: Configuration verification only, no code changes

- Verify component structure (`/app/components/ui/`)
- Verify Tailwind CSS config (`tailwind.config.ts`)
- Verify i18n setup (`app/locales/`)
- Review Prisma schema (`prisma/schema.prisma`)
- Verify API routing (`app/api/`)
- Verify TypeScript & feature branch setup

### Phase 2: Foundational (1-2 hours) - 6 tasks
**Files affected**: Translation keys, schemas, types, authentication

**CRITICAL**: This phase BLOCKS all user stories. Must complete before any story work begins.

- **T007**: Add i18n keys to `app/locales/en/course.json` & `app/locales/zh/course.json`
  ```json
  "discovery": {
    "title": "Discover Courses",
    "empty": "No courses available",
    "enroll": "Enroll",
    "enrolled": "Enrolled",
    "classFull": "Class Full",
    "students": "students"
  }
  ```

- **T008**: Create `app/schemas/enrollment.ts` with Zod schema
  ```typescript
  export const enrollmentSchema = z.object({
    classId: z.string().uuid(),
    courseId: z.string().uuid()
  });
  ```

- **T009**: Verify API response wrapper in `app/api/` (likely exists)

- **T010**: Verify auth middleware in `app/services/auth.server.ts`

- **T011**: Create `app/types/course.ts` with interfaces:
  ```typescript
  export interface DiscoverableCourse { ... }
  export interface CourseCard { ... }
  export interface EnrollmentResponse { ... }
  ```

- **T012**: Verify Prisma client path: `app/generated/prisma/client`

### Phase 3: User Story 1 - InvitationDisplay Redesign (3-5 hours) - 9 tasks
**Files affected**: `app/components/ui/invitation-display.tsx`, `copyable-field.tsx`

**MVP Launch Point**: This phase delivers the first improvement to users (sleek invitation display)

**Key Changes**:
1. **T013**: Change layout from 2-column grid to single-column flex
   - Before: `<div className="grid md:grid-cols-2 gap-6">`
   - After: `<div className="flex flex-col items-center justify-center gap-8">`

2. **T014**: QR code positioning - move to top, add 200x200px minimum
3. **T015-T016**: Copy-to-clipboard feedback for code/URL
4. **T017-T020**: Responsive testing (320px-1920px), dark mode, design colors, spacing
5. **T021**: Manual QA on `/teacher/courses/[courseId]`

**Checkpoint**: InvitationDisplay redesign complete & independently testable ✓

**DEPLOY MVP HERE** (just the InvitationDisplay improvement)

---

### Phase 4: User Story 2 - Course Discovery Page (6-8 hours) - 16 tasks
**Files affected**:
- Backend: `app/services/course-discovery.server.ts` (NEW), `app/api/courses/discover.ts` (NEW), `app/api/enrollments.ts` (NEW)
- Frontend: `app/routes/student/courses/discover.tsx` (NEW), `app/components/student/CourseDiscoveryContent.tsx` (NEW)

**Backend Implementation** (Parallel tasks T022-T026):
1. **T022**: Service `getDiscoverableCourses()` in `course-discovery.server.ts`
   ```typescript
   export async function getDiscoverableCourses(
     studentId: string,
     options?: { limit?; offset?; sort?; search? }
   ) {
     // Fetch courses with isActive=true && has active classes
     // Include teacher info, enrollment counts
     // Exclude already-enrolled courses
   }
   ```

2. **T023**: Service `getStudentEnrolledCourses()`
   - Returns Set<courseId> for fast lookup

3. **T024**: Service `createEnrollment(studentId, classId)`
   - Validate: duplicate check, capacity check, active status
   - Use Prisma transaction for atomicity

4. **T025**: API endpoint GET `/api/courses/discover`
   - Query params: limit, offset, sort, search
   - Returns paginated courses with pagination metadata

5. **T026**: API endpoint POST `/api/enrollments`
   - Validate input with Zod schema
   - Return 201 Created or 409 Conflict with descriptive errors

**Frontend Implementation** (Sequential T027-T037):
6. **T027**: React component `CourseDiscoveryContent.tsx`
   - Course grid layout (responsive: 1/2/3+ columns)
   - Course cards with teacher info, schedule, capacity

7. **T028**: Course card buttons
   - "Enroll", "Enrolled" (disabled), "Class Full" (disabled) states

8. **T029**: Empty state UI when no courses

9. **T030**: Route loader in `discover.tsx`
   - Fetch courses and student's enrolled course IDs

10. **T031**: Route action in `discover.tsx`
    - Handle POST enrollment requests

11. **T032**: Loading states & error handling

12. **T033**: Form submission debouncing (prevent duplicate submissions)

13. **T034-T036**: Responsive testing, dark mode, page header

14. **T037**: Manual QA on `/student/courses/discover`

**Checkpoint**: Course Discovery page complete & independently testable ✓

---

### Phase 5: User Story 3 - Visual Design Consistency (2-3 hours) - 14 tasks
**Files affected**: Configuration audits only (no code changes needed if design system used correctly)

**Key Audits**:
1. **T038-T041**: Audit existing design system (colors, buttons, cards, typography)
   - Document primary, secondary, accent colors from `tailwind.config.ts`
   - Document button variants, sizes, states
   - Document card styling (border-radius, shadow, padding)
   - Document heading/text sizes and weights

2. **T042-T046**: Verify new components use existing design patterns
   - InvitationDisplay uses same button styles ✓
   - InvitationDisplay uses same Card styling ✓
   - CourseDiscoveryContent uses same Button/Card styling ✓
   - Typography matches existing headings ✓
   - Text colors match existing muted-foreground ✓

3. **T047-T050**: Accessibility & spacing verification
   - Light mode contrast ≥ 4.5:1 for normal text ✓
   - Dark mode contrast verified ✓
   - Spacing consistency with existing patterns ✓
   - Border-radius consistent (`rounded-lg` or `var(--radius)`) ✓

4. **T051**: Manual side-by-side QA

**Checkpoint**: Visual design consistency verified ✓

---

### Phase 6: User Story 4 - Database Infrastructure (2-3 hours) - 10 tasks
**Files affected**: `prisma/schema.prisma` (verification only), `app/services/course-discovery.server.ts`

**Database Verification**:
1. **T052-T054**: Verify Prisma schema relationships
   - Course → Class relationship exists ✓
   - Class → Enrollment relationship exists ✓
   - Unique constraint on (studentId, classId) exists ✓
   - Foreign keys & cascading deletes configured ✓

2. **T055**: Verify `_count` aggregation works in Prisma queries

3. **T056-T058**: Test key database queries
   - Fetch courses with active classes
   - Duplicate enrollment prevention
   - Capacity validation

4. **T059**: Performance test
   - Discovery query with 1000+ courses completes in <2 seconds
   - Add indexes if needed

5. **T060**: Race condition testing
   - Two simultaneous enrollments to same full class → only one succeeds

6. **T061**: Document performance characteristics

**Checkpoint**: Database infrastructure robust & performant ✓

---

### Phase 7: Integration & Cross-Story Testing (1-2 hours) - 6 tasks
**Files affected**: No code changes, testing only

**End-to-End Testing**:
1. **T062**: Teacher creates course → generates invitation → student discovers → enrolls → verify persistence
2. **T063**: Error scenarios (duplicate, full, inactive, non-existent)
3. **T064**: Concurrent enrollment operations
4. **T065**: i18n verification (EN & ZH locales)
5. **T066**: Accessibility testing (tab navigation, screen reader)
6. **T067**: Mobile experience testing (320px width, touch)

**Checkpoint**: All components integrated & working ✓

---

### Phase 8: Polish & Cross-Cutting Concerns (2-3 hours) - 12 tasks

**Code Quality**:
1. **T068**: JSDoc comments on service functions
2. **T069**: Comprehensive error messages
3. **T070**: Add logging for key operations
4. **T071**: Toast notifications for enrollment success
5. **T072**: Update documentation
6. **T073**: Code cleanup (remove comments, console.logs, format)

**Validation**:
7. **T074**: `npm run typecheck` ✓
8. **T075**: `npm run lint && npm run lint:fix` ✓
9. **T076**: Bundle size audit
10. **T077**: Quickstart validation
11. **T078**: Final manual testing (all viewports, themes)
12. **T079**: Release notes

**Checkpoint**: Feature production-ready ✓

---

## 📁 File Structure Summary

```
app/
├── components/
│   ├── ui/
│   │   ├── invitation-display.tsx       [MODIFY] - Redesign layout
│   │   ├── copyable-field.tsx           [EXISTING]
│   │   └── qr-display.tsx               [EXISTING]
│   └── student/
│       └── CourseDiscoveryContent.tsx   [NEW] - Discovery component
│
├── routes/
│   ├── teacher/courses/$courseId.tsx    [EXISTING] - Uses updated InvitationDisplay
│   └── student/courses/
│       ├── index.tsx                    [EXISTING]
│       └── discover.tsx                 [NEW] - Discovery page
│
├── services/
│   ├── course-detail.server.ts          [EXISTING]
│   ├── course-discovery.server.ts       [NEW] - Discovery services
│   └── auth.server.ts                   [EXISTING] - Verify middleware
│
├── api/
│   ├── courses/
│   │   └── discover.ts                  [NEW] - GET endpoint
│   └── enrollments.ts                   [NEW] - POST endpoint
│
├── schemas/
│   ├── course.ts                        [EXISTING]
│   └── enrollment.ts                    [NEW] - Zod schema
│
├── types/
│   └── course.ts                        [NEW] - TypeScript interfaces
│
└── locales/
    ├── en/course.json                   [UPDATE] - Add discovery keys
    └── zh/course.json                   [UPDATE] - Add discovery keys

prisma/
└── schema.prisma                        [VERIFY] - No changes needed
```

---

## 🎯 Success Criteria Validation

After completing all phases, verify these success criteria from the specification:

- **SC-001**: InvitationDisplay uses 30-40% less space (vertical)
- **SC-002**: Students can enroll in 3 clicks
- **SC-003**: Discovery page loads in <2 seconds
- **SC-004**: 100% WCAG AA contrast ratios (4.5:1) in both themes
- **SC-005**: Responsive 320px to 4K without horizontal scrolling
- **SC-006**: 100% design system consistency with existing components
- **SC-007**: Enrollment status updates within 1 page refresh
- **SC-008**: QR code scannable at 200x200px minimum
- **SC-009**: Zero duplicate enrollments even with rapid submissions

---

## ⚠️ Critical Path Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKING - must complete before user stories)
    ↓
┌─── Phase 3: User Story 1 (MVP - can deploy here)
├─── Phase 4: User Story 2 (parallel possible)
├─── Phase 5: User Story 3 (parallel - runs with 1-2)
└─── Phase 6: User Story 4 (parallel - database infrastructure)
    ↓
Phase 7: Integration Testing
    ↓
Phase 8: Polish & Production Readiness
```

**Critical Rule**: Do NOT skip Phase 2. It BLOCKS all user story work.

---

## 👥 Team Coordination

### 3-Developer Team Strategy

```
Developer A (Frontend Lead):
  - Phase 1-2: Setup & Foundational (2-4 hours) - ALL
  - Phase 3: User Story 1 (3-5 hours) - InvitationDisplay
  - Phase 5: User Story 3 (2-3 hours) - Visual design
  - Phase 7-8: Integration & Polish - coordinate with team

Developer B (Backend):
  - Phase 2: Foundational (1-2 hours) - help with setup
  - Phase 4: User Story 2 services (3-4 hours) - T022-T026
  - Phase 6: User Story 4 (2-3 hours) - Database validation
  - Phase 7-8: Integration & Polish

Developer C (Frontend):
  - Phase 2: Foundational (1-2 hours) - help with setup
  - Phase 4: User Story 2 UI (3-4 hours) - T027-T037 (after T022-T026)
  - Phase 7-8: Integration & Polish
```

### Timeline

```
Day 1 Morning:    Phase 1-2 (All developers) - 2-4 hours
Day 1 Afternoon:  Phase 3 + Phase 4 Backend in parallel - 3-5 hours
Day 2 Morning:    Phase 4 Frontend (after backend) + Phase 6 - 3-4 hours
Day 2 Afternoon:  Phase 5 Visual Design - 2-3 hours
Day 3 Morning:    Phase 7 Integration Testing - 1-2 hours
Day 3 Afternoon:  Phase 8 Polish & Final Validation - 2-3 hours
Day 3 Evening:    DEPLOY
```

---

## 📋 Implementation Checklist

Use this to track overall progress:

- [ ] **Phase 1**: Setup (6 tasks) - STARTED
- [ ] **Phase 2**: Foundational (6 tasks) - BLOCKED until Phase 1 done
- [ ] **Phase 3**: User Story 1 (9 tasks) - BLOCKED until Phase 2 done
  - [ ] **MILESTONE**: MVP ready to deploy
- [ ] **Phase 4**: User Story 2 (16 tasks) - PARALLEL with Phase 5-6
- [ ] **Phase 5**: User Story 3 (14 tasks) - PARALLEL
- [ ] **Phase 6**: User Story 4 (10 tasks) - PARALLEL
- [ ] **Phase 7**: Integration (6 tasks) - BLOCKED until 3-6 done
- [ ] **Phase 8**: Polish (12 tasks) - BLOCKED until 7 done
  - [ ] **MILESTONE**: Production ready to deploy

---

## 🔧 Developer Quick Reference

### For Local Development

```bash
# Start dev server (if not already running)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing (if test tasks created)
npm test

# Build for production
npm run build
```

### Key Files to Remember

- **Feature specification**: `specs/008-specify-scripts-bash/spec.md`
- **Task list**: `specs/008-specify-scripts-bash/tasks.md` ← PRIMARY REFERENCE
- **Database design**: `specs/008-specify-scripts-bash/data-model.md`
- **API contracts**: `specs/008-specify-scripts-bash/contracts/`
- **Implementation plan**: `specs/008-specify-scripts-bash/plan.md`

### Important Patterns in This Codebase

- **Service layer**: All `.server.ts` files for server-side logic with type exports
- **Validation**: Use Zod schemas in `app/schemas/`
- **API errors**: Use `ApiError` class with `withErrorHandler` middleware
- **i18n**: Keys in `app/locales/{en,zh}/` by feature area
- **Components**: UI-reusable in `app/components/ui/`, feature-specific in `app/components/[feature]/`
- **Testing**: Vitest + React Testing Library + MSW for API mocking

---

## 📞 When Stuck

1. **Check the design documents** - `spec.md`, `data-model.md`, `contracts/`
2. **Review existing patterns** - Look at similar components/services
3. **Reference quickstart.md** - Code templates provided
4. **Check CLAUDE.md** - Project conventions and patterns

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] All 79 tasks marked complete ✓
- [ ] All tests passing (if any)
- [ ] TypeScript strict mode: `npm run typecheck` ✓
- [ ] Linting passes: `npm run lint` ✓
- [ ] Manual QA completed (desktop, tablet, mobile, light mode, dark mode)
- [ ] Success criteria validated (SC-001 through SC-009)
- [ ] No console.logs or debug code
- [ ] Documentation updated
- [ ] Team review passed
- [ ] Feature branch ready for PR review

---

**Good luck with the implementation! You have a comprehensive, production-ready specification and task list. Execute Phase-by-Phase and validate at each checkpoint.** 🚀

