# Fix Report: Grading Streaming Leakage & Process Interruption
**Date:** 2025-12-23
**Status:** Implemented
**Author:** Gemini Agent

## 1. Problem Context (問題背景)

The user reported three interconnected issues during the AI grading process:

1.  **JSON Leakage in UI**: During streaming, the frontend displayed raw JSON code, tool call logs (e.g., `Calling tool...`), and internal arguments instead of clean conversational text.
2.  **Silent Failure / Interruption**: The grading process sometimes terminated early with a "3-Step Process Interrupted" error, resulting in a score of 0 and no feedback.
3.  **Disappearing Thinking Process**: Rich Markdown analysis (Feed Up/Back/Forward) visible during streaming would vanish upon completion, replaced by trivial strings like "Tool Execution".

## 2. Root Cause Analysis (根因分析)

### 2.1 JSON Leakage (Data Multiplexing Issue)
The backend was broadcasting raw `tool-call` events (including full JSON arguments) via Redis to the frontend. The frontend's `useChat` hook was naively rendering all received content, failing to distinguish between `text-delta` (conversational output) and `tool-invocation` (internal logic).

### 2.2 Silent Failure (Prompt Constraint)
In `@app/services/agent-executor.server.ts`, a `prepareStep` function forced the agent's first step to have `toolChoice: 'none'`, intending to force a "thinking mode". However, the Gemini 2.5 Flash model sometimes attempted to call a tool immediately. Being blocked by the system constraint caused the model to output nothing or terminate the stream prematurely, leading to the "process interrupted" fallback.

### 2.3 Disappearing Thinking Process (Logic Gap)
In `@app/services/grading-engine.server.ts`, the logic for constructing the final `thinkingProcess` string relied on specific tool calls (`think_aloud`) or the reasoning of the final step. Since the agent was outputting its analysis as **text reasoning** in early steps (not `think_aloud` tool calls), and the final step often contained only "Tool Execution", the rich initial analysis was discarded during result aggregation.

## 3. Implemented Solution (解決方案)

We applied a multi-layer fix targeting Frontend, Backend, and Logic.

### 3.1 Frontend: Strict Demultiplexing
**File:** `@app/routes/student/assignments/$assignmentId.submit.tsx`

We modified the message handling logic in `useEffect`. Instead of relying on `message.content` (which might mix text and tool calls), we strictly prioritize iterating over `message.parts` and extracting **only** parts with `type === 'text'`.

### 3.2 Backend: Signal Purification
**File:** `@app/services/agent-executor.server.ts`

1.  **Stop Leaking Args**: In the Redis publishing logic, we commented out the `args` property for `tool-call` events. The frontend receives a notification that a tool is running (for UI spinners) but receives **no data** to render textually.
2.  **Remove Constraint**: We removed the `prepareStep` logic that forced `toolChoice: 'none'`. The agent is now free to decide its flow (think or act), preventing silent failures.

### 3.3 Logic: Comprehensive Aggregation
**File:** `@app/services/grading-engine.server.ts`

We rewrote the logic for `thinkingProcess` and `gradingRationale` construction.
1.  **Accumulate All Steps**: We now map through **ALL** agent steps and join their `reasoning` fields.
2.  **Filter Noise**: We added a filter to exclude short or trivial strings (e.g., "Tool Execution", length < 20).
3.  **Result**: The final stored result now includes the full history of the agent's analysis, preserving the "Feed Up/Back/Forward" content generated in early steps.

## 4. Code Changes for Review (程式碼變更摘要)

### A. Frontend Filtering (`$assignmentId.submit.tsx`)

**Old Logic:**
```typescript
let thought = lastMessage.content || '';
// Fallback to parts...
```

**New Logic (Strict):**
```typescript
let thought = '';
const parts = (lastMessage as any).parts;

if (parts && Array.isArray(parts)) {
  // Only extract text parts, ignoring tool-invocations
  thought = parts
    .filter((p: any) => p.type === 'text') // Critical Filter
    .map((p: any) => p.text)
    .join('');
} else {
  thought = lastMessage.content || '';
}
```

### B. Backend Constraint Removal (`agent-executor.server.ts`)

**Removed:**
```typescript
// REMOVED THIS BLOCK
prepareStep: async () => {
  stepCounter++;
  if (stepCounter === 1) {
    return { toolChoice: 'none' }; // Caused silent failures
  }
  return { toolChoice: 'auto' };
},
```

### C. Backend Result Aggregation (`grading-engine.server.ts`)

**New Logic:**
```typescript
// 1. Collect FULL Thinking Process (accumulate reasoning from ALL steps)
thinkingProcess = agentResult.steps
  .map((s: any) => s.reasoning)
  .filter((r: string) => r && r.length > 20 && !r.includes('Tool Execution')) // Noise Filter
  .join('\n\n---\n\n');

// ...

if (feedbackStep?.reasoning && feedbackStep.reasoning.length > 20) {
  gradingRationale = feedbackStep.reasoning;
} else {
  // Fallback: use the accumulated thinking process if specific rationale is missing
  gradingRationale = thinkingProcess;
}
```

## 5. Verification Steps (驗證方法)

1.  **Start Grading**: Initiate an AI grading session.
2.  **Observe Stream**:
    *   Confirm that **NO** raw JSON or `{ "args": ... }` appears in the UI.
    *   Confirm that rich markdown text (Feed Up/Back...) appears gradually.
    *   Confirm "AI is thinking..." spinner appears during tool execution pauses.
3.  **Check Completion**:
    *   Wait for grading to finish.
    *   **Crucial**: Open "View Thinking Process". It should **retain** the rich text seen during streaming, not replaced by "Tool Execution".
    *   Check "Grading Rationale" section for a coherent summary.
