# 01-Research: GradingResultDisplay UI Improvement

## 1. Context
The goal is to redesign the `GradingResultDisplay` component, specifically the "AI Thinking Process" (thought summary) section, to resemble the Google Gemini "Model Thoughts" UI.

## 2. Current State Analysis
**File**: `app/components/GradingResultDisplay.tsx`

**Current UI Features**:
- **Container**: `Collapsible` component.
- **Trigger**: Simple text with `ChevronDown` icon.
- **Content**:
  - Background: Blue gradient (`from-blue-50 to-blue-50/50`).
  - Border: Blue border (`border-blue-200`).
  - Icon: Emoji 🧠.
  - Text: "AI 正在思考..." or the markdown content.

**Code Snippet (Current)**:
```tsx
<CollapsibleContent className="mt-3">
  <div
    className="p-4 bg-gradient-to-br from-blue-50 ... rounded-lg border border-blue-200 ..."
  >
    <div className="text-sm text-muted-foreground leading-relaxed">
      <Markdown>{thoughtSummary}</Markdown>
    </div>
  </div>
</CollapsibleContent>
```

## 3. Target Design (Gemini Style)
Based on the user's request and the provided HTML snippet:

**Visual Characteristics**:
- **Header**:
  - Looks like a button or a clickable row.
  - Label: "Thinking Process" or similar.
  - Icon: Often a "Sparkle" (✨) or similar AI iconography, plus an expansion arrow.
  - Style: Clean, likely `bg-gray-100` or `bg-muted` in dark mode. Rounded corners.
- **Content**:
  - Expands below the header.
  - Background: Often matches the header or is slightly lighter/transparent.
  - Typography: Clean, readable, slightly smaller or muted text for the "thoughts".
- **Animation**: Smooth height transition.

**Key Changes Needed**:
1.  **Icons**: Replace 🧠 emoji with `Sparkles` (Lucide) to match the "Gemini" vibe.
2.  **Colors**: Move away from the "Blue Gradient" to a more neutral, sophisticated "Gray/Muted" palette (e.g., `bg-muted/50`, `bg-secondary`).
3.  **Structure**:
    - The "Trigger" should look more like a UI element (a bar or pill) rather than just text.
    - The "Content" should feel integrated with the trigger.

## 4. Implementation Strategy
- Use `lucide-react` for icons (`Sparkles`, `ChevronDown`, `Bot`).
- Use Tailwind's `bg-muted`, `text-muted-foreground` for the neutral look.
- Refine the `Collapsible` styling to look like a cohesive unit (Header + Content).

## 5. Dependencies
- `lucide-react`: Already available (used `ChevronDown`).
- `shadcn/ui` components: `Collapsible`, `Badge`, `Markdown` are already imported.

## 6. Conclusion
We will refactor the `GradingResultDisplay` to use a "Card" or "Panel" style for the thought process, using neutral colors and Sparkle icons to mimic the Gemini aesthetic.

## 7. New Requirement: Gradient Circular Loader
**User Request**: Add a circular loader animation around the icon, similar to Gemini's UI.
**Visual Reference**:
- A partial ring (arc) surrounding the Sparkle icon.
- The ring has a gradient color (Yellow -> Orange/Red).
- The Sparkle icon is inside, usually Blue/Purple.

**Technical Approach**:
- Use an SVG for the ring to support gradient strokes (`<linearGradient>`).
- Use `stroke-dasharray` to create the "partial" arc effect.
- Apply `animate-spin` (slow) to the SVG ring for the loading effect.
- Center the `Sparkles` icon absolutely within the ring.

## 8. New Requirement: Persistent Streaming Display
**User Request**: 
- The streaming "Thinking Process" (Typewriter effect) should remain visible even after loading is complete.
- It should coexist with the collapsible "Thought Summary" card at the bottom.
- **Goal**: Show the "live" thinking history at the top (where it was streaming), AND the structured summary at the bottom.

**Implication**:
- We need to remove the `if (isLoading) return ...` early return pattern.
- The "Streaming Area" needs to be a permanent part of the layout, perhaps conditionally hidden only if there is absolutely no thought data.
- The layout will be:
  1. Streaming Area (Typewriter) - Always visible if `thoughtSummary` exists (or was streaming).
  2. Score & Feedback.
  3. Collapsible Thought Summary (Markdown).
