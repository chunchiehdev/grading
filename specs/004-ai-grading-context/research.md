# Research & Technical Decisions

**Feature**: AI Grading with Knowledge Base Context
**Date**: 2025-01-16
**Status**: Phase 0 Complete

## Executive Summary

This document consolidates research findings and technical decisions for implementing context-aware AI grading. All decisions prioritize simplicity, reuse of existing infrastructure, and backward compatibility.

## 1. Token Management Strategy

### Research Question

How to handle token limits when combining reference documents, custom instructions, rubric criteria, and student work in a single AI prompt?

### Findings

**Model Limits (as of Jan 2025)**:

- Gemini 2.0 Flash: 1,048,576 tokens (~4MB text) input context
- GPT-4o-mini: 128,000 tokens (~512KB text) input context
- Character-to-token ratio: ~4:1 for English, ~2:1 for Chinese (conservative)

**Estimated Token Budget** (worst-case scenario):

```
Reference documents:  8,000 chars × 5 files = 40,000 chars = ~15,000 tokens (Chinese)
Custom instructions:  5,000 chars = ~2,500 tokens
Rubric criteria:      2,000 chars = ~800 tokens
System prompts:       1,000 chars = ~400 tokens
Student work:         16,000 chars = ~8,000 tokens
AI response:          8,000 chars = ~4,000 tokens (reserved)
----------------------------------------
Total:                ~30,700 tokens (well under both limits)
```

### Decision: **Simple Character-Based Truncation**

**Chosen Approach**: Fixed 8,000 character limit per reference document (no intelligent truncation).

**Rationale**:

1. **Sufficient for typical materials**: Most textbook chapters/lecture notes fit within 8k chars when extracted as plain text
2. **Predictable behavior**: Teachers can estimate if content will be truncated based on file size
3. **Performance**: No CPU overhead for smart truncation algorithms
4. **Clear user feedback**: When truncated, append "(content truncated at 8,000 characters)" note

**Alternatives Considered**:

- **Sentence-boundary truncation**: Rejected - adds complexity, marginal benefit
- **Automatic summarization (LLM-based)**: Rejected - expensive, unreliable, scope creep
- **Dynamic token counting**: Rejected - requires tokenizer library, overkill for current scale

**Implementation**:

```typescript
// pseudocode in loadReferenceDocuments()
if (parsedContent.length > 8000) {
  truncatedContent = parsedContent.substring(0, 8000);
  truncatedContent += '\n\n[Note: Content truncated at 8,000 characters]';
}
```

---

## 2. Prompt Engineering Best Practices

### Research Question

What's the optimal structure for composing AI prompts with multiple context elements?

### Findings

**Tested Orderings** (based on AI research literature + existing codebase patterns):

1. System instruction → Reference knowledge → Rubric criteria → Custom instructions → Student work
2. Reference knowledge → Rubric criteria → Custom instructions → Student work (no separate system instruction)
3. Rubric criteria → Reference knowledge → Student work → Custom instructions (instructions last)

**Results from Existing System Analysis**:

- Current system uses markdown sections (## headings) for structure
- AI models respond well to explicit section labels in prompt
- Order matters: Context should precede evaluation criteria

### Decision: **Reference Knowledge First, Instructions Last**

**Chosen Structure**:

```markdown
## Reference Knowledge Base

[Parsed reference document 1]
[Parsed reference document 2]
...

## Grading Criteria (Rubric)

[Rubric criteria with scoring levels]

## Special Grading Instructions

[Teacher's custom instructions]

## Student Submission

[Student's work content]

## Grading Task

[Instructions for AI to evaluate and respond in JSON format]
```

**Rationale**:

1. **Knowledge foundation first**: AI absorbs reference context before seeing evaluation criteria
2. **Custom instructions near task**: Teacher priorities fresh in AI's "mind" when evaluating
3. **Student work last**: AI compares against all established context
4. **Matches existing pattern**: Current gemini-prompts.server.ts uses similar structure

**Alternatives Considered**:

- **Few-shot examples**: Rejected - requires manually curated examples, maintenance burden
- **Chain-of-thought prompting**: Rejected - increases token usage, current zero-shot works well
- **Instructions before rubric**: Rejected - rubric is more structured, should come first

**Implementation**:

- Extend `GeminiPrompts.generateTextGradingPrompt()` with new sections
- Use `formatReferenceDocuments()` helper (similar to existing `formatCriteriaDescription()`)
- Keep markdown formatting (## headers, bullet lists) for AI readability

---

## 3. Database Performance & Schema Design

### Research Question

Should reference file IDs be stored as JSON array in a single field, or use a dedicated junction table?

### Findings

**Option A: JSON Array in AssignmentArea**

```prisma
model AssignmentArea {
  referenceFileIds String? @db.Text  // JSON: ["uuid1", "uuid2", ...]
}
```

**Option B: Junction Table**

```prisma
model AssignmentReferenceFile {
  assignmentAreaId String
  uploadedFileId   String
  order            Int
  @@unique([assignmentAreaId, uploadedFileId])
}
```

**Performance Analysis** (based on PostgreSQL + Prisma):

- JSON array queries: `WHERE referenceFileIds LIKE '%uuid%'` - not indexed, but rarely needed
- Junction table queries: `JOIN assignment_reference_files` - indexed, but adds complexity
- Typical query: "Get assignment with reference files" - JSON parsed client-side, junction requires JOIN

**Existing Codebase Pattern**:

- Current system uses JSON fields for flexible data (e.g., `Rubric.criteria`, `Notification.data`)
- No performance issues with JSON fields at current scale
- Prisma handles JSON parsing transparently

### Decision: **JSON Array Storage**

**Rationale**:

1. **Simplicity**: No new table, no JOIN complexity in queries
2. **Sufficient for scale**: 1-5 files per assignment, no performance bottleneck
3. **Follows existing pattern**: Matches Rubric.criteria and other JSON fields
4. **Order preservation**: JSON array maintains upload order naturally
5. **No query requirements**: System doesn't need to "find all assignments using file X"

**Trade-offs Accepted**:

- Cannot efficiently query "which assignments reference this file?" (not needed)
- Cannot add per-file metadata (order, weight, tags) without schema change (YAGNI)

**Implementation**:

```prisma
model AssignmentArea {
  // ... existing fields
  referenceFileIds String? @db.Text  // JSON array of UploadedFile.id
}

// In code:
const fileIds: string[] = JSON.parse(assignment.referenceFileIds || "[]");
```

**Index Strategy**:

- No index on `referenceFileIds` (never queried directly)
- Add index on `GradingResult.assignmentAreaId` (new foreign key for joins)

---

## 4. File Upload UX Patterns

### Research Question

How to provide teachers with clear feedback during multi-file upload and async parsing?

### Findings

**Current System Behavior**:

- File upload: Displays progress percentage (0-100%)
- Parsing: External API, polled every 2 seconds, max 60 attempts (2 minutes)
- Parse status stored in `UploadedFile.parseStatus` enum: PENDING → PROCESSING → COMPLETED/FAILED

**UX Patterns Evaluated**:

1. **Sequential upload**: Upload file 1 → parse → upload file 2 → parse (slow)
2. **Parallel upload**: Upload all → parse all in background (fast, but complex status display)
3. **Hybrid**: Upload files in parallel, show aggregate status (balanced)

### Decision: **Parallel Upload with Individual Status Indicators**

**Chosen Pattern**:

```
Reference Materials (Optional)

[Upload Button] Add PDF/DOCX/TXT files (max 5 files)

Files:
┌─────────────────────────────────────────┐
│ ✓ textbook-ch3.pdf (2.3 MB) - Parsed   │ [Remove]
│ ⏳ answer-key.pdf (1.1 MB) - Parsing... │ [Remove]
│ ❌ notes.docx (0.5 MB) - Parse failed   │ [Retry] [Remove]
└─────────────────────────────────────────┘
```

**Rationale**:

1. **Reuse existing upload UI**: Leverage current file upload component patterns
2. **Clear status per file**: Teacher knows which files are ready/pending/failed
3. **Non-blocking**: Teacher can continue editing assignment while parsing happens
4. **Graceful failure handling**: Failed files can be removed or retried individually

**Implementation**:

- Component: `ReferenceFileUpload.tsx`
- State management: Local React state for upload progress, query for parse status
- Polling: Check `UploadedFile.parseStatus` every 3 seconds after upload completes
- Actions: Remove file (delete from list), Retry parse (re-trigger PDF parser API)

**Edge Cases**:

- **Teacher saves assignment while files parsing**: Accept - grading will use only completed files
- **Teacher closes page during parsing**: Accept - parsing continues server-side, files ready on next visit
- **All files fail to parse**: Warning shown, but assignment still saved (graceful degradation)

---

## 5. I18n Language Detection & Passing

### Research Question

How to detect user's interface language and ensure AI provides feedback in the same language?

### Findings

**Current i18n Setup** (from CLAUDE.md):

- Library: i18next + react-i18next
- Languages: English (en), Traditional Chinese (zh)
- Detection: Automatic language detection with fallbacks
- Storage: User preference persisted in localStorage

**Language Detection Points**:

1. **Client-side**: `i18n.language` from react-i18next hook
2. **Server-side**: `Accept-Language` header (less reliable)
3. **User profile**: Not currently stored in database

**Current AI Grading**:

- Default language: Hardcoded to Traditional Chinese (`'zh'`)
- Language parameter: Passed to `aiGrader.grade()` but always `'zh'`

### Decision: **Pass Language from Client to Server API**

**Chosen Approach**:

```typescript
// Client-side (React component)
const { i18n } = useTranslation();
const userLanguage = i18n.language; // 'en' or 'zh'

// API call
const response = await fetch('/api/grading/session', {
  method: 'POST',
  body: JSON.stringify({
    ...gradingData,
    language: userLanguage, // ← New parameter
  }),
});

// Server-side (grading-engine.server.ts)
await aiGrader.grade(gradingRequest, userLanguage || 'zh');
```

**Rationale**:

1. **Explicit is better than implicit**: No guessing from headers, client knows language
2. **Reuses existing i18n**: No new detection logic needed
3. **Fallback to Chinese**: If language not provided, use current default behavior
4. **Stateless**: No need to store language preference in database

**Alternatives Considered**:

- **Parse Accept-Language header**: Rejected - unreliable, doesn't reflect user's UI choice
- **Store language in user profile**: Rejected - adds database field, unnecessary complexity
- **Infer from rubric language**: Rejected - rubric may be bilingual or different from user's preference

**Implementation**:

- Modify `GradingSession` API to accept optional `language` parameter
- Pass through to `processGradingResult()` → `aiGrader.grade()`
- Gemini/OpenAI prompts: Include language instruction in system message
- Default: `'zh'` (backward compatible with existing behavior)

**Testing**:

- Switch UI language → Verify AI feedback language matches
- Omit language parameter → Verify fallback to Chinese
- Invalid language code → Verify fallback to Chinese

---

## Summary of Decisions

| Decision Area      | Chosen Approach                          | Key Reason                       |
| ------------------ | ---------------------------------------- | -------------------------------- |
| Token Management   | Fixed 8000 char truncation per doc       | Simple, predictable, sufficient  |
| Prompt Structure   | Reference → Rubric → Instructions → Work | Optimal for AI understanding     |
| File Storage       | JSON array in single field               | Follows existing pattern, simple |
| Upload UX          | Parallel upload + individual status      | Clear feedback, non-blocking     |
| Language Detection | Pass from client via API parameter       | Explicit, reuses i18n, stateless |

**No Additional Research Needed** - All unknowns resolved. Ready for Phase 1 design.

---

## References

- Existing codebase analysis: `app/services/ai-grader.server.ts`, `app/services/gemini-prompts.server.ts`
- Prisma schema: `prisma/schema.prisma` (JSON field patterns)
- Token limits: OpenAI/Google AI official documentation
- i18n setup: `app/i18n.ts`, `app/locales/` directory structure
