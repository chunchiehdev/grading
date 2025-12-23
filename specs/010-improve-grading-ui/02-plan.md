# 02-Plan: GradingResultDisplay UI Redesign

## 1. Goal
Redesign the `GradingResultDisplay` component to adopt a "Gemini-like" aesthetic for the AI Thinking Process section. This involves switching from a blue-gradient style to a neutral, clean, gray-scale style with "Sparkle" iconography.

## 2. Files to Modify
- `app/components/GradingResultDisplay.tsx`

## 3. Detailed Changes

### 3.1. Imports
- Add `Sparkles` to `lucide-react` imports.

### 3.2. Loading State (`isLoading`)
- **Current**: Blue gradient box with "AI 正在思考..." and 🧠 emoji.
- **New**: A subtle, pulsing gray container.
  - Icon: `Sparkles` (animate-pulse).
  - Text: "Thinking..." or "Analyzing...".
  - Background: `bg-muted/40` or `bg-secondary/20`.

### 3.3. Thought Summary Section (The "Gemini" Box)
- **Container**: Use a `Collapsible` that looks like a unified card.
- **Trigger**:
  - Full-width (or distinct) button look.
  - Background: `hover:bg-muted/50` transition.
  - Icon: `Sparkles` (text-purple-500/text-blue-500 to give a hint of AI magic).
  - Text: "Thinking Process" / "思考過程".
- **Content**:
  - Background: `bg-muted/30` or transparent inside the container.
  - Padding: `p-4`.
  - Text: `text-muted-foreground`.

## 4. Code Snippets

### New Imports
```tsx
import { ChevronDown, Sparkles } from 'lucide-react';
```

### Helper Component: GeminiSpinner
```tsx
const GeminiSpinner = () => (
  <div className="relative flex items-center justify-center w-5 h-5">
    <svg className="absolute inset-0 w-full h-full animate-spin duration-3000" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" /> {/* amber-500 */}
          <stop offset="100%" stopColor="#EC4899" /> {/* pink-500 */}
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="url(#spinner-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 20"
      />
    </svg>
    <Sparkles className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
  </div>
);
```

### New Loading State
```tsx
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="h-24 w-full">
        <LoadingAnalysisIcon isLoading={true} />
      </div>
      <div className="animate-in fade-in duration-500">
        <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
          <div className="flex items-center gap-3 p-3 px-4 text-sm font-medium text-muted-foreground bg-muted/50">
            <GeminiSpinner />
            <span>AI 正在思考...</span>
          </div>
          <div className="p-4 pt-2 text-sm text-muted-foreground/80 leading-relaxed max-h-[300px] overflow-y-auto">
             {/* ... content ... */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### New Thought Summary Section
```tsx
{thoughtSummary && (
  <section className="mt-6">
    <Collapsible defaultOpen={false} className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 px-4 text-sm font-medium hover:bg-muted/50 transition-colors group text-left">
        <div className="flex items-center gap-3">
          <GeminiSpinner />
          <span>{t('grading:aiThinkingProcess')}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/30">
          <Markdown>{thoughtSummary}</Markdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </section>
)}
```

## 5. Verification
- Check if the "Thinking Process" section looks like a contained card.
- Verify the expand/collapse animation works smoothly.
- Verify the "Sparkles" icon is present and styled correctly.

## 6. Persistent Streaming Implementation
**Goal**: Keep the streaming typewriter view visible even after loading finishes.

### Changes
1.  **Refactor `GradingResultDisplay`**:
    - Remove the `if (isLoading) return ...` block.
    - Move the "Streaming/Loading" UI block to the top of the main `return` JSX.
    - Condition: Show this block if `isLoading` is true OR if `thoughtSummary` exists.
    - **Visual Distinction**:
        - If `isLoading`: Show `GeminiSpinner` (rotating).
        - If `!isLoading`: Show static `Sparkles` or keep `GeminiSpinner` but static (or maybe hide the spinner and just keep the text? User said "show what it just showed"). Let's keep the header consistent.

### Code Structure
```tsx
export function GradingResultDisplay(...) {
  // ... hooks ...

  // 1. Streaming/Thinking Area (Always visible if there is content or loading)
  const showThinkingArea = isLoading || thoughtSummary;

  return (
    <div className={cn('space-y-6 pb-6', className)}>
      
      {/* Top: Streaming Thinking Process */}
      {showThinkingArea && (
        <div className="animate-in fade-in duration-500 mb-6">
           {/* ... The Typewriter UI ... */}
           {/* Use GeminiSpinner if loading, or maybe a static icon if done? */}
        </div>
      )}

      {/* Middle: Result Content (Only if result exists) */}
      {result ? (
        <>
          {/* Score Header */}
          {/* Feedback */}
          {/* Criteria Details */}
        </>
      ) : (
        /* Empty State if not loading and no result */
        !isLoading && <EmptyGradingState ... />
      )}

      {/* Bottom: Collapsible Summary (The original one) */}
      {thoughtSummary && (
         /* ... Collapsible UI ... */
      )}
    </div>
  );
}
```
