# Research: Unified Form Layout Patterns

**Feature**: `001-unify-form-layouts`  
**Date**: 2025-10-16  
**Purpose**: Document design decisions, patterns, and best practices for unifying form layouts

## Overview

This research document consolidates findings on responsive design patterns, semantic theming, and accessibility requirements for creating a unified form layout system across four creation forms in the grading platform.

## 1. Responsive Design Patterns

### Decision: Five-Breakpoint Responsive System

**Rationale**: The codebase already uses a consistent five-breakpoint system based on Tailwind CSS defaults, which provides excellent coverage from mobile to ultrawide displays.

**Breakpoints**:

- **Base** (< 640px): Mobile phones (portrait)
- **sm** (640px+): Mobile phones (landscape), small tablets
- **lg** (1024px+): Tablets (landscape), small laptops
- **xl** (1280px+): Desktop monitors
- **2xl** (1536px+): Large desktop monitors, ultrawide displays

### Container Width Pattern

**Decision**: Use standardized max-width responsive container:

```tsx
className = 'max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8';
```

**Rationale**: This pattern is already established in `courses/new.tsx` and `classes/new.tsx`. It provides:

- Optimal reading width on all devices (prevents excessively wide forms)
- Centered layout with breathing room
- Progressively wider content area as screen size increases
- Consistent horizontal padding that scales with viewport

**Alternatives Considered**:

- **Fixed max-width**: Rejected because it doesn't adapt to large displays
- **Full-width container**: Rejected because forms become hard to scan on wide screens
- **Custom breakpoint values**: Rejected to maintain consistency with existing Tailwind config

### Vertical Spacing Pattern

**Decision**: Progressive spacing that scales with viewport:

```tsx
// Between form sections
className = 'space-y-6 lg:space-y-8 xl:space-y-10';

// Within card sections
className = 'space-y-5 lg:space-y-6';

// Between fields
className = 'space-y-2 lg:space-y-3';
```

**Rationale**: Smaller screens need tighter spacing to maximize visible content; larger screens benefit from more breathing room. This graduated approach is already working well in existing forms.

**Measured Values**:

- Base spacing: 1.5rem (24px) between sections, 1.25rem (20px) within cards
- Large spacing: 2rem (32px) between sections, 1.5rem (24px) within cards
- XL spacing: 2.5rem (40px) between sections

### Text Scaling Pattern

**Decision**: Four-tier responsive text sizing:

```tsx
// Page titles
className = 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl';

// Field labels, descriptions
className = 'text-base lg:text-lg xl:text-xl';

// Input content
className = 'text-base lg:text-lg xl:text-xl';
```

**Rationale**: Progressive enhancement - mobile gets readable base sizes, desktop gets more impactful typography. This maintains hierarchy while adapting to available space.

## 2. Semantic Color Token System

### Decision: Exclusive Use of HSL-Based Semantic Tokens

**Rationale**: The project already implements a comprehensive design token system in `app/tailwind.css` with CSS variables for both light and dark modes. Using these tokens ensures:

- Automatic theme adaptation without code changes
- Consistent color relationships across the application
- Centralized theme management
- Future-proof (can change theme colors globally)

### Core Token Mapping

**Backgrounds**:

- `bg-background` → Light: hsl(45 14% 93%), Dark: hsl(0 0% 10%)
- `bg-card` → Light: hsl(0 0% 99%), Dark: hsl(0 0% 15%)
- `bg-popover` → Light: hsl(0 0% 100%), Dark: hsl(0 0% 3.9%)

**Text**:

- `text-foreground` → Light: hsl(0 0% 3.9%), Dark: hsl(0 0% 90%)
- `text-card-foreground` → Light: hsl(0 0% 3.9%), Dark: hsl(0 0% 90%)
- `text-muted-foreground` → Light: hsl(0 0% 45.1%), Dark: hsl(0 0% 65%)

**Interactive Elements**:

- `border` → Light: hsl(0 0% 60%), Dark: hsl(0 0% 26%)
- `ring` → Light: hsl(0 0% 3.9%), Dark: hsl(0 0% 80%)
- `bg-accent` → Light: hsl(0 0% 96.1%), Dark: hsl(0 0% 15%)

**State Colors**:

- `bg-destructive` → Red for errors/delete actions
- `bg-primary` → Brand color for primary actions
- `bg-secondary` → Subtle backgrounds for secondary actions

### Hard-Coded Color Exceptions

**Decision**: Only one acceptable hard-coded color - blue for submit buttons:

```tsx
className = 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';
```

**Rationale**: This is a deliberate brand decision visible in existing forms. The blue creates a strong call-to-action that stands out from the neutral semantic token palette. The `dark:` variants ensure it adapts appropriately.

**Prohibition**: No other hard-coded colors allowed (`text-gray-700`, `bg-red-500`, etc.). All other colors MUST use semantic tokens.

## 3. Component Styling Standards

### Card Components

**Decision**: Unified card styling pattern:

```tsx
<div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
```

**Rationale**: This pattern from `courses/new.tsx` provides:

- **rounded-2xl** (16px): More modern, friendly feel than default rounded-lg
- **shadow-sm**: Subtle elevation without overwhelming the content
- **Progressive padding**: Tighter on mobile (1.25rem), generous on desktop (2.5rem)
- **Semantic bg-card**: Automatic theme adaptation

**Evidence**: Already successfully implemented in 2/4 forms.

### Input Field Styling

**Decision**: Consistent input dimensions and typography:

```tsx
<Input className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl" />
<Textarea className="rounded-xl text-base lg:text-lg xl:text-xl" />
```

**Rationale**:

- **Height scaling**: Larger touch targets on desktop, appropriately sized for mobile
- **rounded-xl** (12px): Complements rounded-2xl cards (maintains visual hierarchy)
- **Text scaling**: Ensures readability at all viewport sizes

**Accessibility**: Heights meet WCAG 2.1 touch target minimums (44x44px) at all breakpoints.

### Label Styling

**Decision**: Uniform label appearance:

```tsx
<Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
```

**Rationale**:

- **font-medium**: Strong enough to distinguish from input text, not overbearing
- **text-foreground**: Ensures maximum contrast for readability
- **Responsive sizing**: Scales proportionally with input text

### Button Layout

**Decision**: Flexible row layout with consistent sizing:

```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
  <Button className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl">
```

**Rationale**:

- **flex-col on mobile**: Stacked buttons prevent cramping, easier to tap
- **sm:flex-row**: Side-by-side when space allows (≥640px)
- **flex-1**: Buttons expand equally to fill available width
- **Progressive gap**: Visual breathing room scales with viewport

## 4. Page Header Patterns

### Decision: Centered Header with Subtitle

**Current Pattern** (courses/new.tsx, classes/new.tsx):

```tsx
<div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
    {title}
  </h1>
  <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">{subtitle}</p>
</div>
```

**Competing Pattern** (assignments/new.tsx):

```tsx
<PageHeader title={...} subtitle={...} />
```

**Decision**: Migrate assignments to centered header pattern.

**Rationale**:

- **Visual impact**: Centered headers feel more modern and welcoming for creation flows
- **Consistency**: 2/4 forms already use this pattern
- **Better mobile experience**: Centered text is easier to scan on narrow screens
- **PageHeader usage**: Reserve PageHeader for detail/list views, not creation forms

**Complexity Note**: Rubrics form has inline action buttons in header (Preview, Save). These will move to the same centered header area but remain functional buttons, not part of a PageHeader component.

## 5. Accessibility Considerations

### Keyboard Navigation

**Research Finding**: shadcn/ui components (Button, Input, Select, etc.) already provide:

- Full keyboard accessibility (Tab, Enter, Space, Arrow keys)
- Focus indicators via `focus:ring-ring` tokens
- ARIA labels and roles

**Decision**: No custom accessibility code needed. Rely on shadcn/ui base components.

### Touch Target Sizes

**WCAG 2.1 Requirement**: Minimum 44x44px touch targets.

**Verification**:

- Base input height: h-11 (44px)  
- Base button height: h-11 (44px)  
- sm breakpoint: h-12 (48px)  
- lg breakpoint: h-14 (56px)  

**Result**: All touch targets meet or exceed WCAG requirements at every breakpoint.

### Color Contrast

**Research Finding**: Semantic tokens in `app/tailwind.css` are carefully tuned:

- `text-foreground` on `bg-background`: High contrast for body text
- `text-muted-foreground`: Readable but de-emphasized
- `text-card-foreground` on `bg-card`: Ensures card content is readable

**Decision**: Use semantic tokens exclusively. No manual contrast calculations needed.

### Screen Reader Support

**Research Finding**: React Router Form component and shadcn inputs already include:

- Proper label associations (htmlFor attributes)
- Error announcement support (via Alert components)
- Required field indicators

**Decision**: Maintain existing patterns. Ensure all inputs have associated labels.

## 6. Error Handling Patterns

### Decision: Unified Alert Component Usage

```tsx
{
  actionData?.error && (
    <Alert variant="destructive" className="rounded-2xl lg:text-base">
      <AlertDescription>{t(actionData.error)}</AlertDescription>
    </Alert>
  );
}
```

**Rationale**:

- **rounded-2xl**: Matches card styling for visual cohesion
- **lg:text-base**: Slightly larger on desktop for better readability
- **variant="destructive"**: Semantic variant triggers red theming automatically
- **Positioning**: Always placed immediately after Form opening tag, before first card

**Consistency Check**: This pattern is already in `courses/new.tsx` and `classes/new.tsx`.

**Migration**: `assignments/new.tsx` uses slightly different placement - will standardize.

## 7. i18n Translation Strategy

### Decision: No Changes to Translation Keys

**Rationale**: This is a layout/styling refactor. All existing translation keys work as-is:

- `t('course:create')` → Form titles
- `t('course:classForm.className')` → Field labels
- `t('common:save')` → Button text

**Research Finding**: Forms use different i18n namespaces:

- Courses/Classes: `course` namespace
- Assignments: `course:assignment.area.*` keys
- Rubrics: `rubric` namespace

**Decision**: Preserve namespace conventions. No translation file updates needed.

## 8. Complex Form Handling (Rubrics)

### Challenge: Rubric Form Complexity

The rubric creation form (`rubrics/new.tsx`) is fundamentally different:

- Multiple nested cards (Basic Info, Categories, Criteria)
- Interactive state (selected category, selected criterion)
- Action buttons in header (Preview, Save)
- Complex internal layout (CategoryNav, Accordion)

### Decision: Apply Outer Consistency, Preserve Inner Complexity

**What Changes**:

-   Centered header layout (title + subtitle)
-   Container max-width and padding
-   Card styling (rounded-2xl, shadow-sm, semantic tokens)
-   Overall page structure

**What Stays**:

-   Multiple Card components for different sections
-   CategoryNav and CriterionItemAccordion internal components
-   Complex state management
-   Custom action button placement (but with consistent button styling)

**Rationale**: The rubric's internal complexity is domain-driven (managing categories and criteria). We can't simplify this without losing functionality. However, the outer "shell" (page header, container, card containers) can absolutely follow the unified pattern.

## 9. Reusable Component Abstractions

### Decision: Create Three Minimal Layout Components

**1. FormPageLayout.tsx**

```tsx
// Purpose: Centered header + main container wrapper
// Props: title, subtitle, children, backLink (optional)
// Used by: All 4 creation forms
```

**Rationale**: Eliminates 20+ lines of duplicate header markup in each form.

**2. FormSection.tsx**

```tsx
// Purpose: Consistent card wrapper for form sections
// Props: children, className (for additional spacing if needed)
// Used by: All form sections (Basic Info, Schedule, etc.)
```

**Rationale**: Encapsulates `rounded-2xl shadow-sm p-5 sm:p-6...` pattern. Makes it impossible to accidentally use inconsistent styling.

**3. FormActionButtons.tsx**

```tsx
// Purpose: Standard Cancel + Submit button layout
// Props: cancelTo, submitText, cancelText, isLoading (optional)
// Used by: All forms except rubrics (which has custom header buttons)
```

**Rationale**: Most forms have identical Cancel/Submit layouts. This component ensures they stay consistent.

### Anti-Pattern: No FormBuilder Abstraction

**Not Doing**: Creating a generic form builder that tries to handle all form types.

**Rationale**: Courses, classes, assignments, and rubrics have different fields and structures. A generic builder would either:

1. Be too rigid (can't handle special cases like rubric complexity)
2. Be too flexible (becomes a complex configuration system, defeating simplicity)

**Better Approach**: Layout components handle structure, route files handle business logic.

## 10. Testing Strategy

### Visual Regression Testing

**Decision**: Manual QA checklist + screenshot comparison

**Test Cases**:

1. Light mode rendering at 375px, 768px, 1280px, 1920px
2. Dark mode rendering at same breakpoints
3. Form validation error states
4. Long text overflow handling (titles, descriptions)
5. Focus states on inputs, buttons, selects

**Rationale**: The project uses Vitest for unit/integration tests, but visual consistency is best verified via manual review or screenshot tools (not currently set up).

### Component Unit Tests

**Decision**: Test layout components for correct className application

**Test Examples**:

```ts
test('FormSection applies responsive padding classes', () => {
  render(<FormSection>Content</FormSection>);
  expect(screen.getByText('Content').parentElement).toHaveClass('p-5', 'sm:p-6', 'lg:p-8');
});
```

**Scope**: Focus on layout components. Route components remain integration-tested via existing patterns.

### Accessibility Testing

**Decision**: Use @testing-library/react for keyboard and screen reader checks

**Required Tests**:

- Tab navigation through all form fields
- Enter key submits form
- Escape key in modals (rubric preview)
- Label associations (getByLabelText)

## 11. Migration Rollout Plan

### Decision: Incremental Migration with Feature Branch

**Order**:

1. **Phase 1**: Create layout components (`FormPageLayout`, `FormSection`, `FormActionButtons`)
2. **Phase 2**: Migrate simplest forms first (`courses/new.tsx`, `classes/new.tsx` - already close to target)
3. **Phase 3**: Migrate `assignments/new.tsx` (requires changing from PageHeader to centered header)
4. **Phase 4**: Migrate `rubrics/new.tsx` (most complex, apply outer structure only)
5. **Phase 5**: Visual QA and cleanup

**Rationale**: Lowest-risk changes first, complex changes last. Each phase can be tested independently.

**Rollback Strategy**: Feature branch allows clean revert. Each form migration is a separate commit for granular rollback if needed.

## 12. Performance Considerations

### Decision: No Performance Impact Expected

**Research Finding**:

- This refactor involves only className changes
- No new component renders
- No JavaScript logic changes
- No network requests affected
- Tailwind CSS is already loaded and cached

**Measurement Points**:

- Lighthouse scores should remain identical
- Time to Interactive (TTI) should not change
- Cumulative Layout Shift (CLS) should remain 0 (same DOM structure)

**Risk Mitigation**: If any layout shift is observed during testing, revert the specific change causing it.

## 13. Documentation Requirements

### Decision: Create quickstart.md in Phase 1

**Content**:

- How to use the new layout components
- Examples of migrating a form to the unified pattern
- Visual reference showing before/after comparisons
- Troubleshooting common issues (e.g., "My card isn't rounded" → check className override)

**Audience**: Future developers adding new creation forms to the platform.

**Location**: `specs/001-unify-form-layouts/quickstart.md`

## Conclusion

This research phase has resolved all technical unknowns identified in the Technical Context. The path forward is clear:

1. Create three minimal layout components
2. Migrate forms incrementally (simple → complex)
3. Rely on existing semantic tokens and shadcn/ui components
4. Validate with manual QA and component tests
5. Document patterns for future use

**Next Step**: Phase 1 (Design & Contracts) - Define component APIs and create data models.
