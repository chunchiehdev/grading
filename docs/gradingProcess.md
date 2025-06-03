Collecting workspace informationThe data flow for the grading process in your workspace is as follows:

1.  **Initiating a Grading Session**:
    *   The process typically begins with the creation and then starting of a grading session. The function `startGradingSession` in grading-session.server.ts is key here.
    *   It updates the `GradingSession` status to `PROCESSING`.
    *   It retrieves all pending `GradingResult` items associated with this session.
    *   These pending results are transformed into an array of `SimpleGradingJob` objects.
    *   These jobs are then passed to `addGradingJobs` from simple-grading.server.ts.

2.  **Job Queuing and Processing**:
    *   In simple-grading.server.ts, `addGradingJobs` adds the jobs to an in-memory `jobQueue`.
    *   If not already processing, it calls `processQueue`.
    *   `processQueue` iterates through the `jobQueue`:
        *   For each `job`, it calls `processGradingResult(job.resultId)` from grading-engine.server.ts.
        *   After processing each job, it calls `updateGradingSessionProgress(job.sessionId, job.userId)` (from `app/services/grading-session.server.ts`) to update the overall session's progress.
        *   A delay of 3 seconds is introduced between jobs if the queue is not empty.

3.  **Core Grading Logic**:
    *   `processGradingResult(resultId)` in grading-engine.server.ts handles the individual grading task:
        *   It marks the `GradingResult` as processing (e.g., by calling `startGradingResult`).
        *   It fetches the `GradingResult` details, including the associated `UploadedFile` and `Rubric`.
        *   It retrieves the file content by calling `getFileFromStorage` (from storage.server.ts).
        *   It prepares a `GeminiFileGradingRequest` containing the file buffer, MIME type, criteria, file name, and rubric name.
        *   It obtains an instance of the Gemini service via `getGeminiService()` from gemini.server.ts.
        *   It calls `geminiService.gradeDocumentWithFile(geminiRequest)`.

4.  **AI Interaction (Gemini Service)**:
    *   The `gradeDocumentWithFile` method in gemini.server.ts:
        *   Manages API rate limits and retries with backoff, including API key rotation if multiple keys are configured.
        *   Uploads the file buffer to the Gemini API.
        *   Generates the appropriate grading prompt using `GeminiPrompts.generateFileGradingPrompt()` from gemini-prompts.server.ts.
        *   Sends the request to the Gemini API to grade the document.
        *   Parses the JSON response from Gemini.
        *   Cleans up the uploaded file from Gemini's storage.
        *   Returns the grading result or an error.

5.  **Handling Grading Outcome**:
    *   Back in `processGradingResult`:
        *   If the Gemini service returns a successful result, it updates the `GradingResult` in the database with the scores and feedback (e.g., by calling `updateGradingResult`).
        *   If the Gemini service fails, or if the initial file upload to Gemini fails, it may attempt a fallback using parsed text content (if available) by calling `geminiService.gradeDocument()`.
        *   If grading ultimately fails, it marks the `GradingResult` as failed (e.g., by calling `failGradingResult`).
        *   It updates the progress of the individual `GradingResult` at various stages (e.g., by calling `updateGradingProgress`).

6.  **Updating Session Progress**:
    *   The `updateGradingSessionProgress` function in grading-session.server.ts is called after each job is processed (from `simple-grading.server.ts`) and also after a successful grading within `grading-engine.server.ts`.
    *   It recalculates the overall progress of the `GradingSession` based on the statuses of all its associated `GradingResult` items.
    *   It updates the `GradingSession` status (e.g., `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) and progress percentage in the database.

**File Summary and Role:**

*   grading-session.server.ts: Orchestrates the start and tracks the overall progress of a grading session.
*   simple-grading.server.ts: Manages an in-memory queue for grading jobs and processes them sequentially.
*   grading-engine.server.ts: Contains the core logic for processing a single grading task, including file retrieval and invoking the AI service.
*   gemini.server.ts: Handles all interactions with the Google Gemini API, including file uploads, prompt generation, API calls, and response parsing. It also implements resilience patterns like retries and API key management.
*   gemini-prompts.server.ts: Centralizes the generation of prompts and system instructions for the Gemini API.
*   grading-result.server.ts (inferred): Manages the status, progress, and storage of individual grading results.
*   storage.server.ts (inferred): Handles fetching file data from the primary storage.

This flow ensures that grading tasks are processed systematically, with interactions with the external AI service managed for rate limiting and reliability.