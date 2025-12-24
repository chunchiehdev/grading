# 012-Separate Thinking and Reasoning

## 1. Problem Analysis

The current system design presents the following issues:

1. **Mixed Content:** The `thoughtSummary` field contains both the "AI's real-time Thinking Process" and the "Final Grading Rationale."
2. **UI Redundancy:** The `GradingResultDisplay` shows the full `thoughtSummary` at both the top (Loading area) and the bottom (Collapsible area), resulting in redundant and cluttered information.
3. **State Overwrite:** The frontend streaming content (pure thinking process) is directly overwritten by the backend's returned complete Markdown (combined content with headers) upon completion, causing an abrupt visual jump.
4. **Data Instability:** In Direct Mode or instances of "Agent laziness," `thoughtSummary` may contain only the rationale while missing the thinking process.

## 2. Core Concept: Process vs. Product

We should view these as distinct types of information and differentiate them clearly in both the database and the UI:

* **Thinking Process**
* **Nature:** The AI's "scratchpad" or "inner monologue." Includes Hattie analysis, self-correction, and confidence checks.
* **Source:**
* Agent Mode: Output from the `think_aloud` tool.
* Direct Mode (Thinking Model): The `thinking` field returned by the API.


* **Value:** Builds user trust (Transparency) by proving the AI seriously read the essay rather than grading randomly.
* **UI Positioning:** **"AI Analysis Log."** It acts as the protagonist during the grading process (live streaming); after completion, it should recede to a secondary position (e.g., a collapsed panel) for interested users to review.


* **Grading Rationale**
* **Nature:** The "formal report" for teachers and students. Explains the reasoning behind the score and points out specific strengths and weaknesses.
* **Source:**
* Agent Mode: The `reasoning` parameter in the `generate_feedback` tool.
* Direct Mode: The `reasoning` field in the output Schema.


* **Value:** The core of educational feedback.
* **UI Positioning:** **"Grading Report."** Should be the core part of the results page, displayed alongside the score and grading criteria.



## 3. Proposed Solution

### 3.1 Database Schema Changes

Modify the `GradingResult` and `Submission` models in `prisma/schema.prisma`:

1. **Add `thinkingProcess` (String?, @db.Text):** Stores the AI's raw thinking process.
2. **Add `gradingRationale` (String?, @db.Text):** Stores the AI's formal grading rationale.
3. **Mark `thoughtSummary` as Deprecated:** Retain for backward compatibility, but it will no longer be the primary field in the new logic.

### 3.2 Backend Logic Updates

Modify `app/services/grading-engine.server.ts`:

1. **Agent Mode:**
* Collect content from `think_aloud` steps -> Store in `thinkingProcess`.
* Collect `reasoning` from `generate_feedback` step -> Store in `gradingRationale`.


2. **Direct Mode:**
* From API return `thinking` (if available) -> Store in `thinkingProcess`.
* From Schema output `reasoning` -> Store in `gradingRationale`.


3. **Return Format:** The API should return these two independent fields to the frontend, rather than pre-assembled Markdown.

### 3.3 UI Refactoring

Modify `app/components/grading/GradingResultDisplay.tsx`:

1. **Top Area - AI Analysis Log**
* **Source:** `thinkingProcess` (or streaming content during Loading).
* **Style:** Default **Collapsed**, titled "View AI Analysis Log."
* **Content:** Displays Hattie analysis, confidence levels, and other process info.


2. **Main Area - Grading Rationale**
* **Source:** `gradingRationale`.
* **Position:** Moved below the score card as part of the "Overall Comments."
* **Style:** Default **Expanded**, rendered in Markdown so students can see the basis for grading immediately.


3. **Bottom Area**
* Remove the originally redundant Collapsible block.



## 4. Implementation Steps

1. **Database Migration:**
* Modify `schema.prisma`.
* Run `npx prisma migrate dev --name add_thinking_process_and_rationale`.
* Regenerate Prisma Client.


2. **Backend Update:**
* Update data collection and storage logic in `grading-engine.server.ts`.
* Update `submission.server.ts` to support reading/writing new fields.


3. **Frontend Update:**
* Update `GradingResultDisplay.tsx` to split display logic.
* Update the Reducer in `student/assignments/$assignmentId.submit.tsx` to ensure streaming content maps correctly to `thinkingProcess`.



## 5. Expected Outcome

* **Clear Data Structure:** Separation of process and result facilitates future analysis and debugging.
* **Distinct UI Hierarchy:** Students prioritize seeing the important grading reasons, while the secondary thinking process is tucked away.
* **Full Scenario Support:** Correct information display regardless of whether Agent Mode or Direct Mode is used.