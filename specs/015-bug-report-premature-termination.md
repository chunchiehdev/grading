# Bug Report: Agent Premature Termination (Zero Score Issue)

**Date:** 2025-12-23
**Status:** Open
**Severity:** Critical
**Component:** Backend (Agent Executor)

## 1. Issue Description

When a user initiates grading, the system fails to produce a final score. The UI displays "0/100" and the error message: "評分過程未正常完成（3-Step Process Interrupted）" (Grading process not completed normally).

While the agent successfully performs initial steps (like `calculate_confidence`), it terminates **before** calling the mandatory `generate_feedback` tool. This triggers the fallback mechanism which returns a default zero-score result.

## 2. Observed Behavior (Logs Analysis)

### Backend Logs
```
[Agent] Executing ToolLoopAgent
...
[Bridge] Received Redis message ... {"type":"tool-call", "toolName":"calculate_confidence", ...}
[Agent Tool] Confidence calculated
[Agent] Tool completed: calculate_confidence
...
[Bridge] Received finish event
WARN: [Agent] generate_feedback was not called, building fallback result from steps...
WARN: [Agent Fallback] 3-Step Process interrupted. No intermediate scores available.
INFO: [Agent] Grading completed (with 0 score)
```

### Analysis
1.  The agent **is** running and successfully executing the `calculate_confidence` tool.
2.  However, immediately after this tool execution, the loop terminates.
3.  The `generate_feedback` tool is **never called**.
4.  The system falls back to a fail-safe state (0 score).

## 3. Root Cause Hypothesis

The issue lies in the **stop condition logic** or the **system prompt instructions**.

### A. Premature Stop Condition
In `app/services/agent-executor.server.ts`, the `stopWhen` function might be triggering too early.
If the agent outputs a stop sequence (like `result.finishReason === 'stop'`) after `calculate_confidence` *without* calling the next tool, the loop ends. We might not be forcing the agent hard enough to continue to the final step.

