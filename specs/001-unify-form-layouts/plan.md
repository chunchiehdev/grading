# Implementation Plan: Unify Form Layout Patterns

**Branch**: `001-unify-form-layouts` | **Date**: 2025-10-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-unify-form-layouts/spec.md`

## Summary

Refactor four creation form pages (`courses/new.tsx`, `classes/new.tsx`, `assignments/new.tsx`, `rubrics/new.tsx`) to follow a unified design pattern. The reference design uses centered headers with Apple-style card layouts, responsive scaling, and semantic Tailwind tokens for theme consistency. This is a frontend-only styling refactor with zero functional changes - no new features, no API modifications, no database schema changes.

**Technical Approach**: Extract common layout patterns into reusable abstractions, apply consistent Tailwind utility classes across all forms, verify light/dark mode compatibility with semantic tokens, and validate responsive behavior at all breakpoints.

## Technical Context

**Language/Version**: TypeScript 5.1.6 with React 19.0.0  
**Primary Dependencies**: React Router v7.5.2, Tailwind CSS 3.4.4, Radix UI components (@radix-ui/react-\*), shadcn/ui, lucide-react, clsx  
**Storage**: N/A (frontend-only refactor, no data model changes)  
**Testing**: Vitest 3.1.3 with @testing-library/react 16.3.0, jsdom 26.1.0  
**Target Platform**: Web (SSR with React Router, Node.js 20+)  
**Project Type**: Web application (fullstack React Router/Remix architecture)  
**Performance Goals**: No performance impact (CSS-only changes), maintain existing page load times, zero layout shift (CLS)  
**Constraints**:

- Must preserve all existing form functionality (validation, submission, i18n)
- Must support light/dark mode via semantic tokens only (no hard-coded colors)
- Must maintain responsive behavior across breakpoints (sm:640px, lg:1024px, xl:1280px, 2xl:1536px)
- Must not introduce new dependencies
- Must follow workspace component standards and routing conventions

**Scale/Scope**: 4 form pages, ~200 lines each, affecting teacher workflows only (no student-facing changes)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Note**: Project constitution file (`.specify/memory/constitution.md`) is currently a template without filled principles. No specific constitution gates apply at this time.

**Implicit Quality Gates**:

- ✅ **Zero Breaking Changes**: All existing form functionality must remain intact (Never break userspace)
- ✅ **Simplicity First**: Refactor involves removing inconsistencies, not adding complexity
- ✅ **No New Dependencies**: Uses only existing Tailwind/Radix/shadcn components
- ✅ **Testable**: Visual consistency can be verified via component tests and manual QA

### Re-evaluation after Phase 1 Design ✅

**Complexity Assessment**:

- ✅ **Three new components** (FormPageLayout, FormSection, FormActionButtons): Justified as they eliminate 70+ lines of duplicate layout code per form (280 total lines removed)
- ✅ **No abstraction over-engineering**: Components are purely presentational wrappers, not a form framework
- ✅ **Maintains simplicity**: Each component has 3-4 props max, single responsibility, no complex logic
- ✅ **Zero breaking changes**: All components are opt-in, existing forms continue to work until migrated
- ✅ **No hidden dependencies**: Components use only existing shadcn/ui primitives already in the project

**Design Quality**:

- ✅ **Good taste** (Linus principle): Eliminates special cases by standardizing layout patterns. Each form follows the same structure regardless of content.
- ✅ **User space preservation**: No functional changes to forms. Teachers' workflows remain identical.
- ✅ **Testability**: Component interfaces are simple enough to unit test without mocking complex dependencies.

**Verdict**: Design passes constitution check. Ready for implementation (Phase 2).

## Project Structure

### Documentation (this feature)

```
specs/001-unify-form-layouts/
├── plan.md              # This file
├── research.md          # Phase 0: Tailwind patterns, responsive design, accessibility
├── data-model.md        # N/A (no data changes)
├── quickstart.md        # Phase 1: Developer guide for applying consistent patterns
├── contracts/           # N/A (no API changes)
└── tasks.md             # Phase 2: /speckit.tasks output (not created by this command)
```

### Source Code (repository root)

```
app/
├── components/
│   ├── ui/              # Shadcn/ui base components (Button, Input, Card, etc.)
│   └── forms/           # [NEW] Shared form layout components
│       ├── FormPageLayout.tsx        # Centered header + container wrapper
│       ├── FormSection.tsx           # Consistent card sections
│       └── FormActionButtons.tsx     # Standard Cancel/Submit buttons
│
├── routes/
│   └── teacher/
│       ├── courses/
│       │   ├── new.tsx              # [REFACTOR] Apply unified pattern
│       │   └── $courseId/
│       │       ├── classes/
│       │       │   └── new.tsx      # [REFACTOR] Apply unified pattern
│       │       └── assignments/
│       │           └── new.tsx      # [REFACTOR] Apply unified pattern
│       └── rubrics/
│           └── new.tsx              # [REFACTOR] Apply unified pattern
│
├── tailwind.css         # Existing semantic tokens (no changes)
└── tailwind.config.ts   # Existing config (no changes)

test/
└── components/
    └── forms/
        ├── FormPageLayout.test.tsx  # [NEW] Layout component tests
        ├── FormSection.test.tsx     # [NEW] Section component tests
        └── form-consistency.test.tsx # [NEW] Cross-page consistency tests
```

**Structure Decision**: This is a web application using React Router v7 architecture. The `app/` directory contains all client and server code. Form components follow the established pattern in `app/routes/teacher/`. We will introduce minimal new components in `app/components/forms/` to encapsulate the unified layout pattern, reducing duplication across the four refactored pages.

## Complexity Tracking

_No constitution violations requiring justification._

**Design Decisions**:

- **New component directory** (`app/components/forms/`): Justified to prevent code duplication across 4 form pages and establish reusable patterns for future forms
- **Keeping existing routing structure**: No changes to route definitions in `app/routes.ts` - refactor is internal to existing route files
- **No component library abstraction**: Using composition of existing shadcn/ui components rather than creating a new form framework
