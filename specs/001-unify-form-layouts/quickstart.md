# Quickstart Guide: Unified Form Layouts

**Feature**: `001-unify-form-layouts`  
**Audience**: Developers creating or refactoring creation forms  
**Last Updated**: 2025-10-16

## TL;DR

Use three layout components to create consistent creation forms:

1. **FormPageLayout** → Centered header + container
2. **FormSection** → Card-style form sections
3. **FormActionButtons** → Cancel + Submit buttons

**Before** (70+ lines of layout boilerplate):

```tsx
<div className="min-h-screen bg-background">
  <div className="max-w-2xl lg:max-w-3xl... text-center">
    <h1 className="text-3xl sm:text-4xl...">Title</h1>
    <p className="text-base lg:text-lg...">Subtitle</p>
  </div>
  <div className="max-w-2xl lg:max-w-3xl...">
    <Form method="post">
      <div className="bg-card rounded-2xl shadow-sm p-5...">{/* fields */}</div>
      <div className="flex flex-col sm:flex-row gap-3...">{/* buttons */}</div>
    </Form>
  </div>
</div>
```

**After** (15 lines):

```tsx
<FormPageLayout title={t('course:create')} subtitle={t('course:createSubtitle')}>
  <Form method="post">
    <FormSection>{/* fields */}</FormSection>
    <FormActionButtons cancelTo="/teacher/courses" submitText={t('course:create')} cancelText={t('common:cancel')} />
  </Form>
</FormPageLayout>
```

## Installation

Import from the barrel export:

```tsx
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';
```

Or individually:

```tsx
import { FormPageLayout } from '@/components/forms/FormPageLayout';
import { FormSection } from '@/components/forms/FormSection';
import { FormActionButtons } from '@/components/forms/FormActionButtons';
```

## Component API

### FormPageLayout

**Purpose**: Page-level wrapper with centered header and responsive container.

**Required Props**:

- `title: string` — Main page heading (e.g., "Create New Course")
- `subtitle: string` — Description text under title
- `children: React.ReactNode` — Form content

**Optional Props**:

- `backLink?: { to: string; label: string }` — Navigation link in header
- `className?: string` — Additional classes for customization

**Example**:

```tsx
<FormPageLayout
  title={t('course:create')}
  subtitle={t('course:createSubtitle')}
  backLink={{ to: '/teacher/courses', label: t('common:back') }}
>
  {/* Your form goes here */}
</FormPageLayout>
```

### FormSection

**Purpose**: Wraps form content in a consistent card with semantic theming.

**Required Props**:

- `children: React.ReactNode` — Section content (labels, inputs, etc.)

**Optional Props**:

- `title?: string` — Section heading (e.g., "Basic Information")
- `icon?: React.ReactNode` — Icon to display next to title
- `className?: string` — Additional spacing or layout classes

**Example**:

```tsx
<FormSection title="Basic Information" icon={<BookOpen />}>
  <div className="space-y-2 lg:space-y-3">
    <Label htmlFor="name">Course Name</Label>
    <Input id="name" name="name" required />
  </div>
</FormSection>
```

### FormActionButtons

**Purpose**: Standardized Cancel + Submit button layout.

**Required Props**:

- `cancelTo: string` — Route to navigate on cancel
- `submitText: string` — Submit button label
- `cancelText: string` — Cancel button label

**Optional Props**:

- `isLoading?: boolean` — Show loading state (disables submit)
- `isDisabled?: boolean` — Disable submit (e.g., validation failed)
- `className?: string` — Additional container classes

**Example**:

```tsx
<FormActionButtons
  cancelTo={`/teacher/courses/${courseId}`}
  submitText={t('course:create')}
  cancelText={t('common:cancel')}
  isLoading={navigation.state === 'submitting'}
/>
```

## Complete Example

### Simple Form (Course Creation)

```tsx
import { Form, useActionData, useNavigation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';
import { Input, Textarea, Label, Alert, AlertDescription } from '@/components/ui';

export default function NewCourse() {
  const { t } = useTranslation(['course', 'common']);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  return (
    <FormPageLayout title={t('course:create')} subtitle={t('course:createSubtitle')}>
      <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
        {/* Error alert */}
        {actionData?.error && (
          <Alert variant="destructive" className="rounded-2xl lg:text-base">
            <AlertDescription>{t(actionData.error)}</AlertDescription>
          </Alert>
        )}

        {/* Course details section */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t('course:namePlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>

          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="description" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:description')}
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder={t('course:descriptionPlaceholder')}
              className="rounded-xl text-base lg:text-lg xl:text-xl"
            />
          </div>
        </FormSection>

        {/* Action buttons */}
        <FormActionButtons
          cancelTo="/teacher/courses"
          submitText={t('course:create')}
          cancelText={t('common:cancel')}
          isLoading={navigation.state === 'submitting'}
        />
      </Form>
    </FormPageLayout>
  );
}
```

### Multi-Section Form (Class Creation)

```tsx
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';
import { PeriodSelector } from '@/components/course/PeriodSelector';
import { Users, MapPin, Clock } from 'lucide-react';

export default function NewClass() {
  const { course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  return (
    <FormPageLayout
      title={t('course:classForm.newClass')}
      subtitle={`${t('course:classForm.createFor')} ${course.name}`}
    >
      <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
        {actionData?.error && (
          <Alert variant="destructive" className="rounded-2xl lg:text-base">
            <AlertDescription>{t(`course:${actionData.error}`)}</AlertDescription>
          </Alert>
        )}

        {/* Section 1: Basic info */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:classForm.className')}
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t('course:classForm.classNamePlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>
        </FormSection>

        {/* Section 2: Schedule and location */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
              {t('course:classForm.schedule')}
            </Label>
            <PeriodSelector required weekdayName="weekday" periodName="periodCode" showPreview />
          </div>

          <div className="space-y-2 lg:space-y-3 pt-2 lg:pt-4">
            <Label
              htmlFor="room"
              className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2"
            >
              <MapPin className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
              {t('course:classForm.roomOptional')}
            </Label>
            <Input
              id="room"
              name="room"
              placeholder={t('course:classForm.roomPlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>
        </FormSection>

        {/* Section 3: Capacity */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label
              htmlFor="capacity"
              className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2"
            >
              <Users className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
              {t('course:classForm.capacityOptional')}
            </Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder={t('course:classForm.capacityPlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>
        </FormSection>

        {/* Action buttons */}
        <FormActionButtons
          cancelTo={`/teacher/courses/${course.id}`}
          submitText={t('course:classForm.create')}
          cancelText={t('course:classForm.cancel')}
        />
      </Form>
    </FormPageLayout>
  );
}
```

## Styling Guidelines

### Input Fields

**Standard pattern** (copy-paste ready):

```tsx
<Input className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl" />
```

**Textarea**:

```tsx
<Textarea className="rounded-xl text-base lg:text-lg xl:text-xl" rows={4} />
```

**Select/DatePicker** (use defaults, they're already consistent):

```tsx
<Select name="rubricId" required>
  <SelectTrigger className="bg-background border-border">{/* ... */}</SelectTrigger>
</Select>
```

### Labels

**Standard pattern**:

```tsx
<Label htmlFor="fieldId" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
  {t('label.key')}
</Label>
```

**With icon**:

```tsx
<Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2">
  <Icon className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
  {t('label.key')}
</Label>
```

### Error Alerts

**Standard pattern** (place immediately after `<Form>` opening tag):

```tsx
{
  actionData?.error && (
    <Alert variant="destructive" className="rounded-2xl lg:text-base">
      <AlertDescription>{t(actionData.error)}</AlertDescription>
    </Alert>
  );
}
```

### Form Spacing

**Between sections**:

```tsx
<Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
```

**Within a section** (between field groups):

```tsx
<FormSection>
  <div className="space-y-2 lg:space-y-3">{/* Label + Input */}</div>
  <div className="space-y-2 lg:space-y-3">{/* Another Label + Input */}</div>
</FormSection>
```

## Common Patterns

### Required Field Indicator

```tsx
<Label>
  {t('field.label')} <span className="text-red-500">*</span>
</Label>
```

### Optional Field Indicator

```tsx
<Label>{t('field.labelOptional')}</Label>
```

(Translation key includes "Optional" text)

### Loading State

```tsx
import { useNavigation } from 'react-router';

export default function MyForm() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <FormActionButtons
      isLoading={isSubmitting}
      // ... other props
    />
  );
}
```

### Conditional Sections

```tsx
{
  showAdvancedOptions && <FormSection title="Advanced Options">{/* ... */}</FormSection>;
}
```

## Complex Forms (Rubrics)

For forms with custom internal structure (like rubrics with nested categories), apply the pattern selectively:

**What to use**:

- ✅ FormPageLayout for outer structure
- ✅ FormSection for top-level cards
- ✅ Semantic tokens throughout

**What to skip**:

- ❌ FormActionButtons (rubric has custom button placement)
- ❌ Enforcing single-section layout (rubric needs multiple cards)

**Example**:

```tsx
<FormPageLayout title={t('rubric:header.newRubricTitle')} subtitle={t('rubric:newRubricSubtitle')}>
  {/* Custom action buttons in header area */}
  <div className="flex justify-center gap-4 mb-8">
    <Button onClick={handlePreview}>Preview</Button>
    <Button onClick={handleSave}>Save</Button>
  </div>

  <Form method="post" id="rubric-form">
    <div className="space-y-6">
      {/* FormSection for basic info */}
      <FormSection>
        <RubricForm data={rubricData} onChange={updateRubricForm} />
      </FormSection>

      {/* FormSection for categories */}
      <FormSection>
        <CategoryNav categories={categories} />
      </FormSection>

      {/* FormSection for criteria */}
      <FormSection>
        <CriterionList criteria={criteria} />
      </FormSection>
    </div>
  </Form>
</FormPageLayout>
```

## Troubleshooting

### "My card isn't rounded"

**Problem**: Card appears square.  
**Solution**: Check if you're overriding `rounded-*` classes. FormSection already applies `rounded-2xl`.

### "Buttons are stacked on desktop"

**Problem**: Cancel/Submit buttons stack vertically even on wide screens.  
**Solution**: Ensure you're using FormActionButtons, which has `sm:flex-row` built in.

### "Dark mode looks wrong"

**Problem**: Colors don't adapt to dark mode.  
**Solution**: Use semantic tokens (`bg-card`, `text-foreground`) instead of hard-coded colors (`bg-white`, `text-gray-900`).

### "Form container is too narrow/wide"

**Problem**: Container doesn't match other forms.  
**Solution**: FormPageLayout uses the standard max-width pattern. Don't override with custom max-width classes.

### "Input heights are inconsistent"

**Problem**: Some inputs are taller/shorter than others.  
**Solution**: Apply the standard input className:

```tsx
className = 'rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl';
```

## Migration Checklist

Refactoring an existing form? Follow these steps:

1. **Replace page wrapper**:

   - ❌ Remove manual `<div className="min-h-screen...">`
   - ✅ Add `<FormPageLayout title={...} subtitle={...}>`

2. **Replace section cards**:

   - ❌ Remove `<div className="bg-card rounded-2xl shadow-sm p-5...">`
   - ✅ Add `<FormSection>` around each section

3. **Replace action buttons**:

   - ❌ Remove manual button layout divs
   - ✅ Add `<FormActionButtons cancelTo={...} submitText={...} cancelText={...} />`

4. **Update input classes**:

   - ✅ Apply standard input className (see Styling Guidelines)

5. **Update label classes**:

   - ✅ Apply standard label className (see Styling Guidelines)

6. **Verify semantic tokens**:

   - ✅ Check for hard-coded colors (`text-gray-700`, `bg-white`)
   - ✅ Replace with semantic tokens (`text-muted-foreground`, `bg-background`)

7. **Test responsive behavior**:

   - ✅ View at 375px, 768px, 1280px, 1920px
   - ✅ Verify buttons stack on mobile, side-by-side on desktop
   - ✅ Check text scaling at each breakpoint

8. **Test dark mode**:

   - ✅ Toggle theme and verify all colors adapt correctly
   - ✅ Check contrast for labels, inputs, buttons

9. **Verify functionality**:

   - ✅ Submit form (ensure action still works)
   - ✅ Test validation errors (ensure alerts display)
   - ✅ Test cancel navigation (ensure Link works)

10. **Clean up**:
    - ✅ Remove unused className constants
    - ✅ Remove commented-out old code
    - ✅ Format with Prettier

## Best Practices

### DO ✅

- Use semantic tokens for all colors
- Apply standard input/label classes consistently
- Place error alerts immediately after `<Form>` tag
- Use `space-y-*` for vertical spacing
- Test in both light and dark modes
- Test on mobile viewport (375px)

### DON'T ❌

- Hard-code colors (`bg-white`, `text-gray-700`)
- Override responsive classes without reason
- Create custom card styling (use FormSection)
- Skip accessibility attributes (labels, ARIA)
- Mix different spacing scales
- Add new dependencies for layout

## Additional Resources

- **Spec**: `specs/001-unify-form-layouts/spec.md` — Feature requirements
- **Research**: `specs/001-unify-form-layouts/research.md` — Design decisions and rationale
- **Data Model**: `specs/001-unify-form-layouts/data-model.md` — Component interfaces
- **Workspace Rules**: `.cursor/rules/components-standards.mdc` — General component standards

## Support

**Questions?** Review the migration examples in:

- `app/routes/teacher/courses/new.tsx` (reference implementation)
- `app/routes/teacher/courses/$courseId/classes/new.tsx` (reference implementation)

**Found a bug?** Check if the issue exists in the reference implementations first. If so, it's likely not a component issue but a design decision.

**Need a variant?** Before creating custom layout components, check if you can compose existing components differently (see Complex Forms section).

---

**Last Updated**: 2025-10-16  
**Version**: 1.0.0  
**Status**: Active
