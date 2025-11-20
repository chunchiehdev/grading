# Data Model: Unified Form Layout Components

**Feature**: `001-unify-form-layouts`  
**Date**: 2025-10-16  
**Note**: This feature is a frontend layout refactor with **no database schema changes**.

## Overview

This document defines the component interfaces and prop structures for the three new layout components introduced in this feature. Since this is purely a UI refactor, there are no database entities, API contracts, or state models to define.

## Component Interfaces

### 1. FormPageLayout

**Purpose**: Provides consistent page-level structure with centered header and responsive container.

**TypeScript Interface**:

```typescript
interface FormPageLayoutProps {
  /** Main page title (e.g., "Create New Course") */
  title: string;

  /** Subtitle/description text displayed under title */
  subtitle: string;

  /** Form content (sections, inputs, buttons) */
  children: React.ReactNode;

  /** Optional back link configuration */
  backLink?: {
    to: string;
    label: string;
  };

  /** Optional additional className for customization */
  className?: string;
}
```

**Example Usage**:

```tsx
<FormPageLayout
  title={t('course:create')}
  subtitle={t('course:createSubtitle')}
  backLink={{ to: '/teacher/courses', label: t('common:back') }}
>
  <Form method="post">{/* form content */}</Form>
</FormPageLayout>
```

**Render Structure**:

```tsx
<div className="min-h-screen bg-background">
  {/* Centered header section */}
  <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
      {title}
    </h1>
    <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">{subtitle}</p>
  </div>

  {/* Form container */}
  <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
    {children}
  </div>
</div>
```

**Validation Rules**:

- `title` and `subtitle` are required (non-empty strings)
- `children` must be provided
- `backLink` is optional but if provided, both `to` and `label` must be valid

### 2. FormSection

**Purpose**: Wraps form content in a consistent card container with semantic theming and responsive padding.

**TypeScript Interface**:

```typescript
interface FormSectionProps {
  /** Section content (labels, inputs, etc.) */
  children: React.ReactNode;

  /** Optional additional spacing classes */
  className?: string;

  /** Optional section title (if needed) */
  title?: string;

  /** Optional icon to display with title */
  icon?: React.ReactNode;
}
```

**Example Usage**:

```tsx
<FormSection title="Basic Information" icon={<BookOpen />}>
  <div className="space-y-2 lg:space-y-3">
    <Label htmlFor="name">Course Name</Label>
    <Input id="name" name="name" />
  </div>
</FormSection>
```

**Render Structure**:

```tsx
<div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
  {title && (
    <h2 className="text-lg lg:text-xl font-semibold text-foreground flex items-center gap-2">
      {icon}
      {title}
    </h2>
  )}
  {children}
</div>
```

**Validation Rules**:

- `children` is required
- `title` and `icon` are optional
- `className` can be used to add additional utility classes (e.g., `"mt-6"` for extra top margin)

### 3. FormActionButtons

**Purpose**: Standardizes Cancel + Submit button layout with consistent styling and behavior.

**TypeScript Interface**:

```typescript
interface FormActionButtonsProps {
  /** URL to navigate to when Cancel is clicked */
  cancelTo: string;

  /** Text for submit button */
  submitText: string;

  /** Text for cancel button */
  cancelText: string;

  /** Whether form is currently submitting */
  isLoading?: boolean;

  /** Disable submit button (e.g., validation failed) */
  isDisabled?: boolean;

  /** Optional additional className for the button container */
  className?: string;

  /** Optional custom submit button variant (defaults to blue primary) */
  submitVariant?: 'default' | 'blue';
}
```

**Example Usage**:

```tsx
<FormActionButtons
  cancelTo={`/teacher/courses/${courseId}`}
  cancelText={t('common:cancel')}
  submitText={t('course:create')}
  isLoading={navigation.state === 'submitting'}
/>
```

**Render Structure**:

```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
  <Button
    asChild
    variant="secondary"
    className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
  >
    <Link to={cancelTo}>{cancelText}</Link>
  </Button>
  <Button
    type="submit"
    disabled={isLoading || isDisabled}
    className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
  >
    {isLoading ? <Spinner /> : submitText}
  </Button>
</div>
```

**Validation Rules**:

- `cancelTo` must be a valid route path
- `submitText` and `cancelText` are required non-empty strings
- `isLoading` and `isDisabled` default to `false`

## Component Relationships

```
FormPageLayout
├── Header Section (title, subtitle)
└── Content Container
    ├── Form (from route component)
    │   ├── Error Alert (conditional)
    │   ├── FormSection (repeated)
    │   │   └── Form Fields (route-specific)
    │   └── FormActionButtons
    └── Additional UI (modals, etc.)
```

## State Management

**No Global State**: These are purely presentational components. All state remains in the parent route components:

- Form validation state → React Router Form
- Loading state → useNavigation hook
- Error messages → useActionData hook

**Component State**: Only internal UI state (e.g., focus indicators) managed by shadcn/ui base components.

## Theming

All components use semantic tokens exclusively:

| Element         | Light Mode Token        | Dark Mode Token         |
| --------------- | ----------------------- | ----------------------- |
| Page background | `bg-background`         | `bg-background`         |
| Card background | `bg-card`               | `bg-card`               |
| Title text      | `text-foreground`       | `text-foreground`       |
| Subtitle text   | `text-muted-foreground` | `text-muted-foreground` |
| Card text       | `text-card-foreground`  | `text-card-foreground`  |
| Borders         | `border`                | `border`                |

**Exception**: Submit button uses hard-coded blue (`bg-blue-600` / `dark:bg-blue-500`) as established brand pattern.

## Responsive Behavior

All three components adapt to viewport changes:

**Mobile (< 640px)**:

- Stacked button layout
- Minimum padding (1rem)
- Base text sizes (text-base, h-11)

**Tablet (640px - 1023px)**:

- Side-by-side buttons
- Moderate padding (1.5rem)
- Slightly larger text (sm:text-lg, sm:h-12)

**Desktop (1024px+)**:

- Wider containers (lg:max-w-3xl → 2xl:max-w-5xl)
- Generous padding (2rem - 2.5rem)
- Larger text (lg:text-xl, lg:h-14)

## Accessibility

**WCAG 2.1 Compliance**:

- Touch targets: Minimum 44x44px (h-11 = 44px at base)
- Color contrast: Semantic tokens ensure 4.5:1+ ratios
- Keyboard navigation: All interactive elements focusable
- Screen readers: Proper heading hierarchy (h1 → h2), label associations

**ARIA Attributes**: Inherited from shadcn/ui base components (Button, Input, etc.). No custom ARIA needed.

## File Locations

```
app/components/forms/
├── FormPageLayout.tsx        # Exported component + interface
├── FormSection.tsx           # Exported component + interface
└── FormActionButtons.tsx     # Exported component + interface

app/components/forms/index.ts # Barrel export for convenience
```

## Migration Impact

**Forms Using These Components**:

1. `app/routes/teacher/courses/new.tsx`
2. `app/routes/teacher/courses/$courseId/classes/new.tsx`
3. `app/routes/teacher/courses/$courseId/assignments/new.tsx`
4. `app/routes/teacher/rubrics/new.tsx`

**No Changes To**:

- Database schema (Prisma models)
- API routes or services
- Loader/action functions
- Form submission logic
- Translation files

## Testing Data

**Component Test Scenarios**:

```typescript
// FormPageLayout
describe('FormPageLayout', () => {
  test('renders title and subtitle with correct classes');
  test('renders children in content area');
  test('applies responsive container widths');
  test('renders back link when provided');
  test('omits back link when not provided');
});

// FormSection
describe('FormSection', () => {
  test('applies card styling classes');
  test('renders children');
  test('renders title when provided');
  test('renders icon with title when both provided');
  test('accepts additional className');
});

// FormActionButtons
describe('FormActionButtons', () => {
  test('renders cancel and submit buttons');
  test('disables submit when isLoading true');
  test('disables submit when isDisabled true');
  test('applies blue styling to submit button');
  test('navigates to cancelTo on cancel click');
});
```

## Constraints

**Must Preserve**:

- Existing form functionality (validation, submission, navigation)
- Translation key compatibility
- Route structure and URLs
- Server-side rendering compatibility
- Dark mode support

**Must Not**:

- Add new dependencies
- Introduce breaking changes to form behavior
- Modify database queries or mutations
- Change API contracts
- Alter user workflows

## Conclusion

This data model defines three lightweight, composable components that encapsulate the unified form layout pattern. By keeping them simple and focused, we avoid creating a complex form framework while still achieving consistency across all creation forms.

**Key Principles**:

-   Presentational only (no business logic)
-   Semantic tokens for theming
-   Responsive by default
-   Accessible by design
-   Easy to understand and maintain
