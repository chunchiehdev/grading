# Feature Specification: AI Grading with Knowledge Base Context

**Feature Branch**: `004-ai-grading-context`
**Created**: 2025-01-16
**Status**: Draft
**Input**: User description: "Enable teachers to upload reference documents (PDF/docs) and provide custom grading instructions so AI can grade student work with full course context including textbooks, answer keys, and teaching priorities"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Teacher Uploads Reference Materials (Priority: P1)

A teacher creating an assignment needs to provide reference materials (textbooks, lecture notes, answer keys) so the AI can understand what constitutes a correct answer for this specific assignment.

**Why this priority**: This is the foundational capability that enables context-aware grading. Without reference materials, AI cannot judge correctness, only writing quality. This directly solves the core problem stated: AI currently cannot tell if student work is "correct" vs just "well-written."

**Independent Test**: Can be fully tested by creating an assignment, uploading reference PDFs, and verifying the files are stored and associated with the assignment. Delivers immediate value by establishing the knowledge base before any grading occurs.

**Acceptance Scenarios**:

1. **Given** teacher is creating a new assignment, **When** teacher uploads 2 PDF files (textbook chapter and answer key), **Then** system parses both files and stores parsed content linked to the assignment
2. **Given** teacher has uploaded reference files, **When** teacher views the assignment details, **Then** system displays list of uploaded reference files with parsing status (pending/completed/failed)
3. **Given** reference file parsing fails, **When** teacher views the assignment, **Then** system shows error message and allows re-upload or removal of failed file

---

### User Story 2 - Teacher Provides Custom Grading Instructions (Priority: P1)

A teacher wants to tell the AI what specific aspects to focus on when grading (e.g., "Pay attention to whether students applied Newton's Second Law formula" or "Focus on logical reasoning process, not just final answer").

**Why this priority**: Custom instructions give teachers control over grading priorities without modifying the rubric structure. This is essential for the same rubric to be used flexibly across different assignments with different emphases.

**Independent Test**: Can be fully tested by creating an assignment, entering custom grading instructions in a text field, saving, and verifying the instructions are stored and displayed. Delivers value by allowing teachers to communicate specific expectations to the AI grader.

**Acceptance Scenarios**:

1. **Given** teacher is creating an assignment, **When** teacher enters custom grading instructions "重點檢查是否套用了牛頓第二定律公式", **Then** system saves instructions and associates them with the assignment
2. **Given** teacher has saved custom instructions, **When** teacher edits the assignment later, **Then** system displays the previously saved instructions for editing
3. **Given** teacher leaves instructions field empty, **When** teacher saves assignment, **Then** system accepts empty instructions (optional field) and AI grades without custom context

---

### User Story 3 - Student Submission Triggers Context-Aware Grading (Priority: P1)

When a student submits their work, the system automatically combines reference materials, custom instructions, rubric criteria, and student work into a comprehensive prompt for AI grading.

**Why this priority**: This is where the feature delivers its core value - AI receives full context and can judge both correctness and quality. This transforms AI from a surface-level evaluator to a context-aware grader.

**Independent Test**: Can be fully tested by submitting a student file to an assignment with reference materials and custom instructions, then verifying the AI grading result reflects understanding of the reference content (e.g., correctly identifies when student answer matches/diverges from answer key).

**Acceptance Scenarios**:

1. **Given** assignment has reference files and custom instructions, **When** student submits work, **Then** AI receives prompt containing: reference document content + custom instructions + rubric criteria + student work content
2. **Given** AI grades with full context, **When** grading completes, **Then** AI feedback specifically references concepts from reference materials and addresses points mentioned in custom instructions
3. **Given** reference file parsing is still pending, **When** student triggers grading, **Then** system proceeds with grading using only available parsed files and logs warning about missing references

---

### User Story 4 - Language-Aware Grading Feedback (Priority: P2)

The system detects the user's interface language and instructs AI to provide feedback in the same language, ensuring Chinese-speaking teachers/students get Chinese feedback and English-speaking users get English feedback.

**Why this priority**: Important for user experience but not blocking core functionality. Mismatched language feedback is confusing but doesn't prevent grading from working. Can be implemented after P1 features are stable.

**Independent Test**: Can be fully tested by switching interface language between English and Traditional Chinese, submitting work, and verifying AI feedback language matches interface language. Delivers value by improving accessibility for international users.

**Acceptance Scenarios**:

1. **Given** user's interface language is set to Traditional Chinese, **When** AI grades submission, **Then** AI provides all feedback in Traditional Chinese
2. **Given** user's interface language is set to English, **When** AI grades submission, **Then** AI provides all feedback in English
3. **Given** system cannot detect user language, **When** AI grades submission, **Then** system defaults to Traditional Chinese (current behavior)

---

### User Story 5 - Teacher Reviews and Overrides AI Grading (Priority: P2)

After AI provides context-aware grading, teacher reviews the AI analysis, reference file usage, and scores, then makes final adjustments based on their professional judgment.

**Why this priority**: Essential for accountability and quality but can use existing teacher review interface with minor enhancements. Teachers already review AI grades; this story just ensures they can see what context the AI used.

**Independent Test**: Can be fully tested by viewing a graded submission as a teacher, verifying reference materials and custom instructions are displayed alongside AI feedback, and successfully overriding the AI score/feedback. Delivers value by maintaining teacher authority and transparency.

**Acceptance Scenarios**:

1. **Given** submission has been graded by AI with context, **When** teacher views grading results, **Then** teacher sees AI feedback, which references used, and custom instructions that were applied
2. **Given** teacher disagrees with AI assessment, **When** teacher edits score and feedback, **Then** system saves teacher's final verdict and marks submission as teacher-reviewed
3. **Given** AI grading referenced incorrect material, **When** teacher reviews, **Then** teacher can see exactly which reference files were used and provide corrective feedback

---

### Edge Cases

- **What happens when reference file is too large?** System truncates parsed content to prevent token limit violations. Each reference document limited to ~8000 characters (~2000 tokens). If truncated, system adds note "(content truncated)" to AI prompt.

- **What happens when all reference files fail to parse?** System proceeds with grading using only rubric and custom instructions (graceful degradation). Teacher sees warning that reference context was unavailable.

- **What happens when custom instructions are extremely long?** System accepts up to reasonable text length limit (e.g., 5000 characters) and truncates with warning if exceeded.

- **What happens if assignment has no reference files or custom instructions?** System works exactly as before - AI grades using only rubric criteria. This ensures backward compatibility with existing assignments.

- **What happens when student resubmits after teacher has reviewed?** New submission triggers new AI grading with latest reference materials and instructions. Previous teacher feedback is cleared and teacher must review again (existing resubmission behavior).

- **What happens when teacher updates reference files after some students have submitted?** New submissions use updated references. Previously graded submissions retain their original grading context for fairness. Teacher can optionally trigger re-grading for earlier submissions.

- **How does system handle file format incompatibilities?** Only accepts file types supported by existing PDF parser (PDF, DOCX, TXT). Shows clear error message for unsupported formats and prevents upload.

- **What happens when AI providers (Gemini/OpenAI) have outages?** Existing fallback mechanism continues to work: Gemini fails → OpenAI attempted. Both fail → grading marked as failed and can be retried later.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow teachers to upload one or more reference documents (PDF, DOCX, TXT formats) when creating or editing an assignment
- **FR-002**: System MUST parse uploaded reference documents and extract text content using existing PDF parser service
- **FR-003**: System MUST display parsing status (pending/processing/completed/failed) for each uploaded reference document
- **FR-004**: System MUST allow teachers to provide optional custom grading instructions as free-text input (up to 5000 characters)
- **FR-005**: System MUST store association between assignment and reference document IDs as JSON array in database
- **FR-006**: System MUST store custom grading instructions as text field in database
- **FR-007**: System MUST maintain backward compatibility - assignments without reference files or custom instructions continue to work with current grading logic
- **FR-008**: When student triggers grading, system MUST retrieve reference documents' parsed content from database
- **FR-009**: When student triggers grading, system MUST construct AI prompt containing: reference documents content + custom instructions + rubric criteria + student work content (in that order)
- **FR-010**: System MUST truncate each reference document to maximum 8000 characters before including in AI prompt to prevent token limit violations
- **FR-011**: System MUST record which reference documents were successfully included in grading context (for transparency)
- **FR-012**: System MUST handle missing or failed reference documents gracefully - proceed with grading using available context
- **FR-013**: System MUST detect user's interface language setting (from i18n context) and instruct AI to provide feedback in matching language
- **FR-014**: System MUST allow teachers to view which reference files and custom instructions were used for each graded submission
- **FR-015**: System MUST preserve existing teacher review and override capabilities - teachers maintain final authority over grades

### Key Entities *(include if feature involves data)*

- **AssignmentArea**: Represents a homework assignment. New attributes:
  - Collection of reference document IDs (stores which knowledge base files are relevant)
  - Custom grading instructions text (stores teacher's specific grading priorities)
  - Existing attributes: rubric, due date, course/class associations

- **UploadedFile**: Represents an uploaded document. Existing attributes used:
  - Parsed content text (extracted from PDF/DOCX/TXT)
  - Parse status (pending/processing/completed/failed)
  - File metadata (size, type, original filename)

- **GradingResult**: Represents one AI grading task. New attribute:
  - Assignment reference (links back to AssignmentArea to retrieve context)
  - Existing attributes: grading status, AI result JSON, rubric used

- **Submission**: Represents student's submitted work. Existing attributes used:
  - Student work file path
  - AI analysis result
  - Teacher feedback and final score

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Teachers can successfully upload and associate reference documents with assignments in under 3 minutes (including file parsing time)
- **SC-002**: AI grading feedback demonstrates understanding of reference materials by explicitly referencing concepts from uploaded documents in at least 80% of gradings where references are provided
- **SC-003**: System maintains backward compatibility - existing assignments without reference context continue to grade successfully with zero failures
- **SC-004**: Reference document parsing completes within 60 seconds for 90% of typical course materials (PDF files under 5MB)
- **SC-005**: Teachers report increased satisfaction with AI grading accuracy when reference context is provided (target: 40% improvement in teacher satisfaction scores)
- **SC-006**: System handles token limit constraints gracefully - zero grading failures due to prompt size exceeded errors
- **SC-007**: AI feedback language matches user's interface language in 95% of cases
- **SC-008**: Feature adds less than 2 seconds to total grading time compared to current grading flow (excluding file parsing which happens asynchronously)

## Assumptions

- Existing PDF parser API remains stable and supports the file formats needed (PDF, DOCX, TXT)
- Current AI providers (Gemini, OpenAI) have sufficient context window to handle reference materials + rubric + student work (estimated 15,000 tokens total)
- Teachers will provide reference materials in supported file formats and languages that AI models can understand
- File storage (MinIO) has sufficient capacity for reference documents (typically 1-5 files per assignment, 1-10MB each)
- Existing file upload and parsing infrastructure can be reused without major modifications
- i18n (internationalization) system already provides reliable language detection for user interface
- Database supports JSON field types for storing file ID arrays (confirmed: PostgreSQL with Prisma)
- Teachers understand that reference materials improve grading quality and will adopt this feature voluntarily (no mandatory fields)

## Scope

### In Scope
- Upload and associate reference documents with assignments
- Parse reference documents to extract text content
- Store custom grading instructions for assignments
- Combine reference content + instructions + rubric + student work into AI prompts
- Truncate reference content to prevent token limit issues
- Detect user language and instruct AI to match feedback language
- Display reference files and instructions used in grading results
- Maintain backward compatibility with assignments lacking context

### Out of Scope
- Automatic summarization of long reference documents (use simple truncation instead)
- Versioning or tracking changes to reference materials over time
- Support for video or audio reference materials (text documents only)
- Weighted prioritization of multiple reference documents (all treated equally)
- Teacher-configurable truncation limits (use fixed 8000 char limit)
- Batch upload of reference materials across multiple assignments
- Reference material search or tagging system
- Analytics on which reference materials correlate with better student outcomes
- Multi-turn conversational grading where AI asks clarifying questions
