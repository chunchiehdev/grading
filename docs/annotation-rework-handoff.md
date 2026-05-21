# Lumos Annotation Rework Handoff

## Purpose

This document is a handoff for the next AI agent that will rework the Lumos grading annotation UI. The current implementation partially works, but it still has layout and selection lifecycle issues. Please read this document before editing code.

## Product Context

The teacher submission review page has a two-panel grading interface:

```text
Left panel: Student submitted work text
Right panel: AI grading result and overall feedback
```

Teachers need to select text in both panels and attach annotation comments. The experience should feel like reviewing a document: highlight text, add a comment, continue highlighting other passages, and edit/delete comments later.

## User Requirements

### Requirement 1: Left Student Work Panel Width

The left panel shows parsed student submission text from `uploaded_files.parsedContent`.

Expected behavior:

1. The student text should use the available left-panel width effectively.
2. Annotation cards must not permanently shrink the original text column.
3. There should not be a large blank vertical lane inside the left panel when annotation cards exist or do not exist.
4. Multiple annotations should remain visually associated with the corresponding highlighted text.
5. The text highlight and annotation card positioning must stay stable after creating the first annotation.
6. The solution must preserve reading comfort. Do not solve positioning by making the original text column narrow.

Current issue:

The annotation card lane is implemented as a flex sibling with fixed width, for example `w-44 xl:w-48`. This makes the text column lose width permanently and creates visible blank space. The left panel feels underused even when screen space is available.

Desired layout direction:

Annotation cards should not participate in the main text layout flow. Prefer an overlay/absolute lane, or another layout where the original text keeps `w-full` and annotation cards are placed without changing text wrapping.

Important layout warning:

The teacher view currently has containers with `overflow-hidden`, such as the split-panel wrapper and left panel. If annotation cards are positioned outside their parent using `right: -184px`, they may be clipped or overlap the right AI feedback panel. Handle overflow and stacking deliberately.

### Requirement 2: Right AI Overall Feedback Repeated Selection

The right panel contains AI grading output. The `overallFeedback` section is annotatable.

Expected behavior:

1. The teacher can create the first annotation in overall feedback.
2. After saving the first annotation, the teacher can immediately select another passage in the same overall feedback block.
3. Second, third, and later annotations should be as smooth as the first.
4. Existing highlights must not block pointer selection or interfere with new text selection.
5. Annotation cards must not cause the AI feedback text layout to reflow after the first annotation.
6. Markdown-rendered content must remain annotatable.

Current issue:

The first annotation works, but subsequent text selection becomes difficult or unreliable. This is likely caused by DOM rebuilds, reliance on `window.getSelection()` after Recogito mutates the DOM, and layout changes around the annotatable content.

## Package In Use

The project uses:

```ts
@recogito/text-annotator
```

Current imports are in:

```text
app/components/grading/AnnotatableFeedback.tsx
```

Relevant API from the package:

```ts
createTextAnnotator(element, options)
W3CTextFormat(sourceId, container)
UserSelectAction.SELECT
annotator.on('createAnnotation', handler)
annotator.on('updateAnnotation', handler)
annotator.on('deleteAnnotation', handler)
annotator.on('selectionChanged', handler)
annotator.setAnnotations(annotations, replace)
annotator.addAnnotation(annotation)
annotator.updateAnnotation(annotation)
annotator.removeAnnotation(annotationOrId)
annotator.setSelected(idOrIds)
annotator.scrollIntoView(annotationOrId)
annotator.cancelSelected()
annotator.destroy()
```

Important observed behavior:

Recogito renders highlights as spans with:

```html
data-annotation="<annotationId>"
```

Use this DOM attribute to measure highlight position. Do not use a manual TreeWalker for positioning.

Use selector escaping:

```ts
const selector = `[data-annotation="${CSS.escape(annotationId)}"]`;
const span = container.querySelector(selector);
```

## Current Relevant Files

Primary component:

```text
app/components/grading/AnnotatableFeedback.tsx
```

Right AI feedback renderer:

```text
app/components/grading/GradingResultDisplay.tsx
```

Teacher submission page:

```text
app/routes/teacher/submissions/$submissionId.view.tsx
```

Annotation API:

```text
app/routes/api/teacher/submissions/$submissionId.annotations.ts
```

Service layer:

```text
app/services/submission.server.ts
```

Types:

```text
app/types/teacher.ts
```

Locales:

```text
app/locales/en/grading.json
app/locales/zh/grading.json
```

## Existing Functionality That Should Be Preserved

1. Creating annotations on student submission text.
2. Creating annotations on AI overall feedback.
3. Displaying saved annotations from `submission_ai_feedback_comments`.
4. Deleting annotations.
5. Editing annotation comments by double-clicking a card and saving with a check button.
6. API support for `POST`, `PATCH`, and `DELETE` annotation operations.
7. `targetType: "submission"` for student work annotations.
8. `targetType: "overall"` with `targetId: "overall-feedback"` for AI overall feedback annotations.
9. Student submission text should render as plain text, not Markdown, because it comes from parsed PDF text.

## Known Bugs In Current Implementation

### Bug 1: Left Annotation Lane Consumes Width

The side lane is a flex sibling:

```tsx
<div className="hidden lg:block relative shrink-0 w-44 xl:w-48" />
```

Why this is wrong:

1. It permanently removes width from the original text column.
2. It creates the visible blank area the user is complaining about.
3. It solves reflow by sacrificing reading width, which is not acceptable.

Desired fix:

Do not put the annotation card lane in normal flex flow. Keep original text `w-full`. Place annotation cards in a non-layout-affecting layer, such as absolute overlay, or redesign the card list so it does not reduce text width.

### Bug 2: Save/Cancel Can Trigger Full Annotation Rebuild

Problematic pattern:

```ts
annotator.setAnnotations(annotationPayload, true)
```

When `replace = true`, Recogito removes and rebuilds all highlight DOM. This can break or destabilize repeated selection, especially in Markdown content.

Observed risky places:

1. After `savedComments` changes.
2. After `pendingAnnotation` becomes null.
3. Inside dismiss/cancel behavior.

Desired fix:

Use Recogito incrementally.

Recommended lifecycle:

```text
Initial load from server: setAnnotations(existingAnnotations, true)
User creates annotation: Recogito already created it; do not replace all annotations
Delete annotation: removeAnnotation(annotationId)
Edit annotation: updateAnnotation(updatedW3CAnnotation)
External full reload: setAnnotations(newServerAnnotations, true), but only when truly needed
```

Avoid full replacement immediately after saving a newly created annotation.

### Bug 3: Button Position Depends On `window.getSelection()` Too Late

Current risky pattern:

```ts
const selection = window.getSelection();
const range = selection.getRangeAt(0);
const rects = Array.from(range.getClientRects());
```

Why this is fragile:

1. Recogito may already have wrapped text in highlight spans when `createAnnotation` fires.
2. `window.getSelection()` may already be collapsed or cleared.
3. Existing highlight spans split text nodes and make subsequent ranges unstable.
4. If the selection is unavailable, current fallback may call `setAnnotations(..., true)`, causing a full rebuild.

Desired fix:

Use Recogito's annotation id and rendered highlight span:

```ts
const handleCreateAnnotation = (annotation) => {
  requestAnimationFrame(() => {
    const span = container.querySelector(`[data-annotation="${CSS.escape(annotation.id)}"]`);
    const rect = span?.getBoundingClientRect();
    // position button using rect
  });
};
```

If one RAF is not enough, use double RAF. The key point is to measure the annotation span, not the browser selection range.

## Desired Recogito Integration Pattern

### Initialization

Create the annotator once per content/source change:

```ts
const annotator = createTextAnnotator(container, {
  adapter: W3CTextFormat(sourceId, container),
  annotatingEnabled: !readOnly,
  userSelectAction: UserSelectAction.SELECT,
  style: (annotation, state) => ({
    fill: state.selected ? '#f59e0b' : '#fbbf24',
    fillOpacity: state.selected ? 0.32 : 0.18,
    underlineColor: '#d97706',
    underlineThickness: 2,
  }),
});
```

Then load existing annotations once:

```ts
annotator.setAnnotations(existingW3CAnnotations, true);
```

### Create Annotation

On `createAnnotation`:

1. Keep the Recogito-created annotation in place.
2. Open or show the comment button using the rendered `[data-annotation]` span position.
3. When saving the comment to the API succeeds, update local React card state.
4. Do not call `setAnnotations(all, true)` immediately after save.
5. Clear browser selection after the save is complete.

### Cancel Annotation

If the user cancels before saving:

1. Remove only the pending annotation from Recogito.
2. Do not rebuild all annotations.

Example:

```ts
annotator.removeAnnotation(pendingAnnotation.id);
```

### Delete Annotation

After API `DELETE` succeeds:

```ts
annotator.removeAnnotation(annotationId);
```

Then update React card state.

### Edit Annotation Comment

After API `PATCH` succeeds:

1. Convert the updated comment row into W3C annotation.
2. Call:

```ts
annotator.updateAnnotation(updatedW3CAnnotation);
```

3. Update React card state.

The selected text range should not change during comment editing.

## Layout Guidance

### Left Student Work Panel

Avoid this structure:

```text
flex row
  text content flex-1
  annotation lane w-44 shrink-0
```

This creates the blank lane and shrinks text.

Prefer this conceptual structure:

```text
relative wrapper
  text content w-full
  annotation cards absolute overlay layer
```

Implementation considerations:

1. The overlay lane should not affect text layout.
2. The overlay lane must remain visible and not be clipped by `overflow-hidden` ancestors.
3. If overlaying cards inside the left panel, avoid covering too much readable text.
4. If placing cards outside the left panel, adjust parent overflow and z-index deliberately.
5. Cards should align vertically with their highlight spans using `getBoundingClientRect()`.

### Right AI Overall Feedback Panel

The AI feedback panel is narrower and uses Markdown DOM. Be conservative.

Recommended behavior:

1. Do not put a side lane inside the overall feedback text flow.
2. Do not change the text width after the first annotation.
3. Use stacked cards below the overall feedback block or a non-layout-affecting overlay.
4. Repeated selection is more important than side-by-side card alignment in this panel.

## API Expectations

The endpoint should support:

```text
POST   /api/teacher/submissions/:submissionId/annotations
PATCH  /api/teacher/submissions/:submissionId/annotations
DELETE /api/teacher/submissions/:submissionId/annotations
```

Create payload:

```ts
{
  targetType: 'overall' | 'submission';
  targetId: string;
  annotationId: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  comment: string;
}
```

Patch payload:

```ts
{
  annotationId: string;
  comment: string;
}
```

Delete payload:

```ts
{
  annotationId: string;
}
```

Server validation should compare `sourceText.slice(startOffset, endOffset)` with the quote using whitespace normalization. Do not slice offsets from a pre-normalized full source string, because that changes character positions.

## Acceptance Criteria

### Left Panel

1. Open a submission with parsed student text.
2. Select text in the left student work panel and save annotation A.
3. Original text column width should not shrink after annotation A appears.
4. There should not be a large empty fixed lane inside the left panel.
5. Select another passage and save annotation B.
6. Both highlights remain visible.
7. Cards align near their highlights without changing original text wrapping.
8. Delete annotation A. Annotation B still works.
9. Double-click annotation B card, edit text, click check, reload page, updated text persists.

### Right Overall Feedback

1. Select text in AI overall feedback and save annotation A.
2. Immediately select a different passage in the same overall feedback and save annotation B.
3. Repeat for annotation C.
4. No selection dead zone should appear after annotation A.
5. Existing highlight spans should not prevent selecting nearby or separate text.
6. The overall feedback text width should not change after annotations appear.
7. Double-click an annotation card, edit, save with check, reload page, updated text persists.

### Regression Checks

1. `npm run typecheck` must pass.
2. Targeted ESLint should pass for files edited by the rework.
3. Existing PDF fallback should still render when `submissionText` is unavailable.
4. Read-only mode should still prevent creating, editing, or deleting annotations.

## Suggested Implementation Steps

1. Refactor `AnnotatableFeedback` to separate text rendering, Recogito lifecycle, and comment card layout.
2. Replace selection-based button positioning with `[data-annotation]` span positioning.
3. Remove save/cancel paths that call `setAnnotations(all, true)`.
4. Implement incremental Recogito operations: `removeAnnotation`, `updateAnnotation`, and avoid replacing all annotations after create.
5. Redesign side card layout so it does not reduce text width in the left panel.
6. Keep right overall feedback annotation cards stacked or overlayed without affecting text layout.
7. Run typecheck and targeted lint.
8. Manually verify left and right repeated annotation flows in the browser.

## Notes For The Next AI

Do not assume the current implementation is correct just because typecheck passes. The issue is primarily runtime DOM behavior and layout behavior. Be careful with Recogito lifecycle. The most important rule is: do not rebuild all annotations immediately after a user creates one.

Do not use `window.getSelection()` after Recogito fires `createAnnotation` to decide where the comment button should go. Use the rendered annotation span.

Do not let annotation cards sit as a fixed-width flex sibling of the text if the goal is to preserve reading width.
