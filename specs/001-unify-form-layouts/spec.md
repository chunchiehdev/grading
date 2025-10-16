# Feature Specification: Unify Form Layout Patterns

**Feature Branch**: `001-unify-form-layouts`  
**Created**: 2025-10-16  
**Status**: Draft  
**Input**: User description: "Refactor three new.tsx pages to follow consistent design pattern"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consistent Visual Experience Across Creation Forms (Priority: P1)

As a teacher navigating between different creation forms (course, class, assignment, rubric), I want all forms to have a consistent visual structure and interaction pattern, so I can quickly understand how to use any form without relearning the interface.

**Why this priority**: Forms are primary teacher workflows. Inconsistent layouts create cognitive load and make the platform feel unprofessional. This is the foundation for all form interactions.

**Independent Test**: Navigate to any two "new" form pages (e.g., `/teacher/courses/new` and `/teacher/courses/:id/assignments/new`) and verify identical header layout, card styling, button placement, and spacing patterns without checking other forms.

**Acceptance Scenarios**:

1. **Given** I am on the new course form, **When** I navigate to the new assignment form, **Then** both pages display centered headers with identical title/subtitle styling (same font sizes, spacing, alignment)
2. **Given** I view any creation form, **When** I scroll through the page, **Then** all form cards use identical rounded corners, padding, shadow, and background colors
3. **Given** I am on any creation form, **When** I look at action buttons, **Then** all forms show Cancel and Submit buttons with identical sizes, colors, spacing, and layout (flex-row on desktop, flex-col on mobile)
4. **Given** I switch between light and dark mode, **When** viewing any creation form, **Then** all forms correctly apply semantic color tokens (bg-background, text-foreground, bg-card, etc.) consistently

---

### User Story 2 - Unified Form Field Styling (Priority: P2)

As a teacher filling out creation forms, I want all input fields, labels, and form controls to have consistent styling and behavior, so I can focus on the content rather than adapting to different UI patterns.

**Why this priority**: Field-level consistency reduces errors and improves form completion speed. This builds on P1's structural consistency with detailed interaction patterns.

**Independent Test**: Compare any two forms side-by-side and verify input heights, label text sizes, border radius, focus states, and placeholder text styling match exactly across all field types.

**Acceptance Scenarios**:

1. **Given** I view input fields on any creation form, **When** I compare them across forms, **Then** all text inputs use identical height (h-11 sm:h-12 lg:h-14 xl:h-16), rounded corners (rounded-xl), and text sizes (text-base lg:text-lg xl:text-xl)
2. **Given** I interact with select dropdowns or date pickers, **When** I use them on different forms, **Then** they maintain consistent styling with other input fields
3. **Given** I read field labels, **When** comparing across forms, **Then** all labels use identical text sizing (text-base lg:text-lg xl:text-xl), font weight (font-medium), and color (text-foreground)
4. **Given** I encounter optional vs required fields, **When** viewing any form, **Then** required field indicators (red asterisk) are consistently placed and styled

---

### User Story 3 - Responsive Layout Consistency (Priority: P3)

As a teacher using the platform on different devices, I want all creation forms to adapt to screen sizes in the same way, so the mobile and desktop experiences are equally polished and predictable.

**Why this priority**: Responsive behavior should be uniform, but this is less critical than core layout and field consistency. Teachers primarily use desktop for form creation.

**Independent Test**: View any single form on mobile (< 640px), tablet (768px), and desktop (1280px+) viewports and verify it follows the same breakpoint behavior as other forms.

**Acceptance Scenarios**:

1. **Given** I view any creation form on mobile, **When** I check the container width, **Then** all forms use identical max-width constraints (max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl) and padding (px-4 sm:px-6 lg:px-8)
2. **Given** I resize the browser from mobile to desktop, **When** viewing action buttons, **Then** all forms transition from stacked (flex-col) to side-by-side (sm:flex-row) at the same breakpoint
3. **Given** I view page headers on mobile vs desktop, **When** comparing forms, **Then** all use identical text scaling (text-3xl sm:text-4xl lg:text-5xl xl:text-6xl for titles)
4. **Given** I scroll on mobile, **When** viewing form sections, **Then** all forms maintain identical vertical spacing that scales with viewport (space-y-6 lg:space-y-8 xl:space-y-10)

---

### Edge Cases

- What happens when a form has complex nested UI (like rubrics with categories/criteria) that doesn't fit the simple card pattern? Should complex sections use the same card styling but allow custom content structure?
- How does the consistent layout handle forms with varying numbers of sections (assignment has 4+ sections, course has 2)?
- What if a form needs inline validation errors? Should error styling be unified across all forms?
- How should loading states and disabled states appear consistently across all forms?
- Should all forms use the same heading hierarchy (h1 for page title, CardTitle for section headers)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST apply identical centered header layout to all creation forms (courses, classes, assignments, rubrics) with title and subtitle sections
- **FR-002**: System MUST use consistent container max-width values (max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl) and padding (px-4 sm:px-6 lg:px-8) across all creation forms
- **FR-003**: System MUST style all form cards with identical rounded corners (rounded-2xl), shadow (shadow-sm), padding (p-5 sm:p-6 lg:p-8 xl:p-10), and spacing (space-y-5 lg:space-y-6)
- **FR-004**: System MUST use semantic color tokens (bg-background, text-foreground, bg-card, text-card-foreground, border, etc.) for all creation forms to ensure light/dark mode compatibility
- **FR-005**: System MUST standardize all text input fields with height (h-11 sm:h-12 lg:h-14 xl:h-16), rounded corners (rounded-xl), and text size (text-base lg:text-lg xl:text-xl)
- **FR-006**: System MUST standardize all labels with text size (text-base lg:text-lg xl:text-xl), font weight (font-medium), and color (text-foreground)
- **FR-007**: System MUST position action buttons (Cancel/Submit) consistently across all forms using flex layout (flex-col sm:flex-row) with identical gap spacing (gap-3 sm:gap-4 lg:gap-5 xl:gap-6)
- **FR-008**: System MUST apply consistent button styling with height (h-11 sm:h-12 lg:h-14 xl:h-16), rounded corners (rounded-xl), and text size (text-base lg:text-lg xl:text-xl)
- **FR-009**: System MUST use identical blue color scheme for primary submit buttons (bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600) across all forms
- **FR-010**: System MUST apply consistent vertical spacing between form sections (space-y-6 lg:space-y-8 xl:space-y-10)
- **FR-011**: System MUST use consistent responsive text scaling for page titles (text-3xl sm:text-4xl lg:text-5xl xl:text-6xl)
- **FR-012**: System MUST standardize error alert styling with rounded corners (rounded-2xl) and appropriate text size (lg:text-base) using Alert component with destructive variant
- **FR-013**: System MUST preserve existing form functionality (validation, submission, navigation) while updating layout styling

### Key Entities

- **Creation Forms**: Course, Class, Assignment, and Rubric creation pages that currently have inconsistent layout patterns
- **Layout Components**: Shared UI patterns including page containers, headers, form cards, input fields, labels, buttons, and alerts
- **Design Tokens**: Semantic Tailwind classes for colors (bg-background, text-foreground, etc.), spacing, and typography that ensure theme consistency

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Teachers can visually identify all creation forms as part of the same design system without reading URL or page content (100% visual consistency verification)
- **SC-002**: All four creation forms (course, class, assignment, rubric) pass automated CSS class consistency checks for matching layout patterns (container widths, card styling, button dimensions)
- **SC-003**: All creation forms render correctly in both light and dark modes with no hard-coded colors or theming inconsistencies (0 hard-coded hex/rgb colors, 100% semantic token usage)
- **SC-004**: Mobile viewport (375px-640px) displays all forms with identical responsive behavior (stacked buttons, scaled text, consistent padding)
- **SC-005**: Desktop viewport (1280px+) displays all forms with identical centered layout and maximum width constraints
- **SC-006**: All form input fields across creation pages maintain identical dimensions and styling at each breakpoint (sm, lg, xl)
- **SC-007**: Form submission and validation logic remains unchanged (no regression in existing functionality)
- **SC-008**: Time to visually parse and understand any new creation form reduces due to familiar layout pattern (qualitative user feedback)

## Assumptions

- The reference design pattern is the centered header + Apple-style card layout currently used in `courses/new.tsx` and `classes/new.tsx`
- Complex forms (like rubrics with nested categories/criteria) can adapt the card pattern to their content structure while maintaining outer layout consistency
- Existing component library (Button, Input, Label, Card, Alert from `@/components/ui/`) provides sufficient flexibility for unified styling
- Responsive breakpoints (sm, lg, xl, 2xl) are standardized across the application and should not change
- Current blue color scheme for submit buttons (bg-blue-600, etc.) is the desired standard
- Forms that use PageHeader component should migrate to the centered header pattern for consistency
- Translation keys (i18n) for existing forms will remain functional
- Dark mode implementation uses `dark:` variants and semantic tokens as defined in workspace rules

## Out of Scope

- Creating new form functionality or fields beyond existing features
- Changing form validation logic or backend submission handling
- Redesigning complex multi-step forms or wizards (rubric form can keep its internal structure)
- Updating forms outside the "new.tsx" pattern (e.g., edit pages, detail views)
- Changing color schemes or branding beyond consistency enforcement
- Performance optimization or accessibility improvements beyond what Tailwind/shadcn provide
- Updating translation files or adding new i18n keys

## Dependencies

- Tailwind CSS configuration with semantic color tokens (--background, --foreground, etc.) defined in app/tailwind.css
- Shadcn/ui components (Button, Input, Card, Label, Alert) with existing variant support
- React Router Form component for submission handling
- i18n translation system with existing keys for form labels and messages
- Workspace rules for component standards, light/dark mode requirements, and routing conventions
