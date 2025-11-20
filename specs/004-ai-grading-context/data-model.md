# Data Model: AI Grading with Knowledge Base Context

**Feature**: 004-ai-grading-context
**Date**: 2025-01-16
**Status**: Phase 1 Design

## Overview

This document describes the database schema changes required to support context-aware AI grading with reference documents and custom instructions. All changes maintain backward compatibility through nullable fields.

## Schema Changes

### 1. AssignmentArea (Modified)

**Purpose**: Store references to knowledge base files and custom grading instructions for each assignment.

**New Fields**:

```prisma
model AssignmentArea {
  // ... existing fields (id, name, description, courseId, classId, rubricId, dueDate, createdAt, updatedAt)

  //   NEW: Reference knowledge base files
  referenceFileIds    String?  @db.Text

  //   NEW: Custom grading instructions from teacher
  customGradingPrompt String?  @db.Text

  // Relations
  submissions         Submission[]
  gradingResults      GradingResult[]  //   NEW: Reverse relation
  notifications       Notification[]
}
```

**Field Specifications**:

| Field                 | Type | Nullable | Default | Description                                                                                             |
| --------------------- | ---- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `referenceFileIds`    | Text | Yes      | null    | JSON array of UploadedFile UUIDs: `["uuid1", "uuid2", ...]`. Max 5 files. Empty array if no references. |
| `customGradingPrompt` | Text | Yes      | null    | Teacher's custom grading instructions. Max 5000 characters. Plain text, no formatting constraints.      |

**Validation Rules**:

- `referenceFileIds`: Must be valid JSON array of UUID strings (validated client-side before save)
- `customGradingPrompt`: Length ≤ 5000 characters (enforced in Zod schema)
- Both fields optional: Assignment valid with zero, one, or both fields populated

**Indexes**:

- No new indexes needed (fields not queried directly)

---

### 2. GradingResult (Modified)

**Purpose**: Link grading results back to assignment for retrieving reference context.

**New Fields**:

```prisma
model GradingResult {
  id                String   @id @default(uuid())
  gradingSessionId  String
  gradingSession    GradingSession @relation(...)

  uploadedFileId    String
  uploadedFile      UploadedFile @relation(...)

  rubricId          String
  rubric            Rubric @relation(...)

  //   NEW: Link to assignment for context retrieval
  assignmentAreaId  String?
  assignmentArea    AssignmentArea? @relation(fields: [assignmentAreaId], references: [id], onDelete: SetNull)

  // ... existing fields (status, progress, result, errorMessage, normalizedScore, gradingModel, gradingTokens, gradingDuration, createdAt, updatedAt, completedAt)

  @@index([gradingSessionId, status])
  @@index([uploadedFileId])
  @@index([rubricId])
  @@index([normalizedScore])
  @@index([assignmentAreaId])  //   NEW: Index for JOIN performance
}
```

**Field Specifications**:

| Field              | Type          | Nullable | Default | Description                                                                                          |
| ------------------ | ------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `assignmentAreaId` | String (UUID) | Yes      | null    | Foreign key to AssignmentArea. Null for "quick grading" (file + rubric only, no assignment context). |

**Relationship**:

- **Type**: Many-to-one (many GradingResults can reference one AssignmentArea)
- **On Delete**: `SetNull` (if assignment deleted, grading results remain but lose context link)
- **Cascade**: No cascade delete (preserve grading history even if assignment removed)

**Indexes**:

-   **New index**: `@@index([assignmentAreaId])` for efficient joins when loading grading context

---

### 3. UploadedFile (No Changes)

**Existing fields reused** (no schema changes needed):

```prisma
model UploadedFile {
  id               String   @id @default(uuid())
  userId           String
  user             User @relation(...)

  fileName         String   @db.VarChar(500)
  originalFileName String   @db.VarChar(500)
  fileKey          String   @unique
  fileSize         Int
  mimeType         String   @db.VarChar(100)

  // Used for reference documents
  parseStatus      FileParseStatus @default(PENDING)
  parsedContent    String?         @db.Text
  parseError       String?

  isDeleted        Boolean  @default(false)
  deletedAt        DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  expiresAt        DateTime?

  // Relations
  gradingResults   GradingResult[]
}
```

**Usage for Reference Documents**:

- Teachers upload reference files via existing upload endpoint
- System parses files using existing PDF parser API
- `parsedContent` contains extracted text (used in AI prompt)
- `parseStatus` tracks parsing progress (PENDING/PROCESSING/COMPLETED/FAILED)

---

### 4. Submission (No Changes)

**Existing fields sufficient** (no schema changes needed):

```prisma
model Submission {
  id               String        @id @default(uuid())
  studentId        String
  student          User @relation(...)
  assignmentAreaId String
  assignmentArea   AssignmentArea @relation(...)

  filePath         String        @db.VarChar(500)
  uploadedAt       DateTime      @default(now())

  aiAnalysisResult Json?
  finalScore       Int?
  normalizedScore  Float?
  teacherFeedback  String?       @db.Text
  status           SubmissionStatus @default(SUBMITTED)

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}
```

**Relationship to Feature**:

- When student submits, `assignmentAreaId` used to fetch reference files + custom instructions
- AI analysis result stored in `aiAnalysisResult` (existing field)
- No schema changes needed

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────┐
│           AssignmentArea                    │
│─────────────────────────────────────────────│
│ id (PK)                                     │
│ name                                        │
│ rubricId (FK → Rubric)                      │
│ referenceFileIds: String? (JSON)    ← NEW  │
│ customGradingPrompt: Text?          ← NEW  │
│ ...                                         │
└─────────────────────────────────────────────┘
          │
          │ 1:N
          ↓
┌─────────────────────────────────────────────┐
│           GradingResult                     │
│─────────────────────────────────────────────│
│ id (PK)                                     │
│ uploadedFileId (FK → UploadedFile)          │
│ rubricId (FK → Rubric)                      │
│ assignmentAreaId (FK)?              ← NEW   │
│ result (JSON)                               │
│ normalizedScore                             │
│ ...                                         │
└─────────────────────────────────────────────┘
          │
          │ N:1
          ↓
┌─────────────────────────────────────────────┐
│           UploadedFile                      │
│─────────────────────────────────────────────│
│ id (PK)                                     │
│ parseStatus (enum)                          │
│ parsedContent (Text)                        │
│ ...                                         │
└─────────────────────────────────────────────┘

Referenced by AssignmentArea.referenceFileIds (JSON array)
```

**Key Relationships**:

1. **AssignmentArea → UploadedFile**: Indirect via JSON array (no foreign key constraint)
2. **GradingResult → AssignmentArea**: Direct foreign key (nullable, SetNull on delete)
3. **GradingResult → UploadedFile**: Existing relationship (student's submitted work)

---

## Migration Script

### Migration File: `add_assignment_context_fields.sql`

```sql
-- Add reference file IDs (JSON array) to AssignmentArea
ALTER TABLE "assignment_areas"
ADD COLUMN "referenceFileIds" TEXT;

-- Add custom grading instructions to AssignmentArea
ALTER TABLE "assignment_areas"
ADD COLUMN "customGradingPrompt" TEXT;

-- Add assignment link to GradingResult
ALTER TABLE "grading_results"
ADD COLUMN "assignmentAreaId" TEXT;

-- Add foreign key constraint
ALTER TABLE "grading_results"
ADD CONSTRAINT "grading_results_assignmentAreaId_fkey"
FOREIGN KEY ("assignmentAreaId")
REFERENCES "assignment_areas"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add index for join performance
CREATE INDEX "grading_results_assignmentAreaId_idx"
ON "grading_results"("assignmentAreaId");

-- Migration is backward compatible:
-- - All new fields are nullable (no default values needed)
-- - Existing rows remain valid with NULL values
-- - No data migration required
```

**Prisma Migration Command**:

```bash
npx prisma migrate dev --name add_assignment_context_fields
```

**Rollback Strategy**:

```sql
-- If rollback needed
DROP INDEX "grading_results_assignmentAreaId_idx";
ALTER TABLE "grading_results" DROP CONSTRAINT "grading_results_assignmentAreaId_fkey";
ALTER TABLE "grading_results" DROP COLUMN "assignmentAreaId";
ALTER TABLE "assignment_areas" DROP COLUMN "customGradingPrompt";
ALTER TABLE "assignment_areas" DROP COLUMN "referenceFileIds";
```

---

## Backward Compatibility

###   Zero Breaking Changes

**Existing Queries Unaffected**:

1. **Create Assignment**: Optional fields, existing code continues to work

   ```typescript
   // Before (still works)
   await prisma.assignmentArea.create({ data: { name, rubricId, courseId } });

   // After (enhanced)
   await prisma.assignmentArea.create({
     data: {
       name,
       rubricId,
       courseId,
       referenceFileIds: JSON.stringify(fileIds), // Optional
       customGradingPrompt: instructions, // Optional
     },
   });
   ```

2. **Create GradingResult**: Optional field, existing code continues to work

   ```typescript
   // Before (still works)
   await prisma.gradingResult.create({ data: { uploadedFileId, rubricId, gradingSessionId } });

   // After (enhanced)
   await prisma.gradingResult.create({
     data: {
       uploadedFileId,
       rubricId,
       gradingSessionId,
       assignmentAreaId, // Optional - can still be omitted
     },
   });
   ```

3. **Query Assignments**: New fields returned as null for old data
   ```typescript
   const assignment = await prisma.assignmentArea.findUnique({ where: { id } });
   // assignment.referenceFileIds === null (for old assignments)
   // assignment.customGradingPrompt === null (for old assignments)
   // Code must handle nulls gracefully
   ```

**Existing Grading Flow**:

- Assignments created before migration have `referenceFileIds = null` and `customGradingPrompt = null`
- AI grading proceeds normally without context (current behavior)
- No errors, no failed grades, no data loss

---

## Data Validation & Constraints

### Application-Level Validation (Zod Schemas)

```typescript
// app/schemas/assignment.ts

import { z } from 'zod';

export const AssignmentCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  courseId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  rubricId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),

  //   NEW: Reference files validation
  referenceFileIds: z
    .array(z.string().uuid())
    .max(5, 'Maximum 5 reference files allowed')
    .optional()
    .transform((arr) => (arr && arr.length > 0 ? JSON.stringify(arr) : null)),

  //   NEW: Custom instructions validation
  customGradingPrompt: z
    .string()
    .max(5000, 'Maximum 5000 characters allowed')
    .optional()
    .transform((str) => (str && str.trim().length > 0 ? str.trim() : null)),
});

export type AssignmentCreateInput = z.infer<typeof AssignmentCreateSchema>;
```

**Validation Rules**:

- `referenceFileIds`: Array of valid UUIDs, max 5 elements
- `customGradingPrompt`: String, max 5000 chars, trimmed
- Empty arrays/strings converted to null for database consistency

### Database-Level Constraints

**None added** - Validation handled in application layer for flexibility:

- Allows schema evolution without database migrations
- Supports different validation rules per client (teacher vs API)
- Easier to provide user-friendly error messages

---

## Query Patterns

### 1. Fetch Assignment with Reference Files

```typescript
// Get assignment with parsed reference content
async function getAssignmentWithReferences(assignmentId: string) {
  const assignment = await prisma.assignmentArea.findUnique({
    where: { id: assignmentId },
    include: { rubric: true },
  });

  if (!assignment) return null;

  // Parse reference file IDs
  const fileIds: string[] = assignment.referenceFileIds ? JSON.parse(assignment.referenceFileIds) : [];

  // Fetch reference files with parsed content
  const referenceFiles = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      parseStatus: 'COMPLETED',
      isDeleted: false,
    },
    select: {
      id: true,
      originalFileName: true,
      parsedContent: true,
      parseStatus: true,
    },
  });

  return {
    ...assignment,
    referenceFiles,
    customGradingPrompt: assignment.customGradingPrompt,
  };
}
```

### 2. Load Grading Context for AI

```typescript
// Called from grading-engine.server.ts
async function loadGradingContext(resultId: string) {
  const result = await prisma.gradingResult.findUnique({
    where: { id: resultId },
    include: {
      uploadedFile: true,
      rubric: true,
      assignmentArea: {
        select: {
          id: true,
          name: true,
          referenceFileIds: true,
          customGradingPrompt: true,
        },
      },
    },
  });

  if (!result) throw new Error('Grading result not found');

  // Parse reference file IDs
  const fileIds = result.assignmentArea?.referenceFileIds ? JSON.parse(result.assignmentArea.referenceFileIds) : [];

  // Fetch reference documents
  const references = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      parseStatus: 'COMPLETED',
      isDeleted: false,
    },
    select: {
      originalFileName: true,
      parsedContent: true,
    },
  });

  return {
    studentWork: result.uploadedFile.parsedContent,
    rubric: result.rubric,
    referenceDocuments: references,
    customInstructions: result.assignmentArea?.customGradingPrompt || null,
  };
}
```

### 3. Update Assignment Reference Files

```typescript
// Add/remove reference files
async function updateAssignmentReferences(assignmentId: string, fileIds: string[]) {
  // Validate file IDs exist and are parsed
  const validFiles = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      parseStatus: 'COMPLETED',
    },
    select: { id: true },
  });

  if (validFiles.length !== fileIds.length) {
    throw new Error('Some files not found or not parsed');
  }

  // Update assignment
  await prisma.assignmentArea.update({
    where: { id: assignmentId },
    data: {
      referenceFileIds: JSON.stringify(fileIds),
    },
  });
}
```

---

## Performance Considerations

### Query Optimization

**Typical Query**:

```sql
-- Fetch grading result with all context
SELECT
  gr.*,
  aa.referenceFileIds,
  aa.customGradingPrompt
FROM grading_results gr
LEFT JOIN assignment_areas aa ON gr."assignmentAreaId" = aa.id
WHERE gr.id = $1;
```

**Performance Characteristics**:

- **Index used**: `grading_results_assignmentAreaId_idx` (new index)
- **JOIN cost**: Low (1:1 relationship, indexed foreign key)
- **JSON parsing**: Client-side (Prisma/Node.js), negligible overhead
- **Expected latency**: <5ms for JOIN + JSON parse

### Scaling Considerations

**Current Scale**:

- Assignments: ~1000s (typical educational institution)
- Grading results: ~10,000s per semester
- Reference files: ~5,000 unique files (reused across assignments)

**Projected Impact**:

- **Storage**: +2 columns per assignment (minimal - mostly NULL for old data)
- **Query time**: +<1ms for JOIN (well within acceptable range)
- **Index size**: ~100KB for 10k grading results (negligible)

**No performance degradation expected** at current or projected scale.

---

## Testing Strategy

### Database Tests

1. **Migration Test**:

   ```typescript
   test('migration adds nullable fields without errors', async () => {
     // Run migration
     await runMigration('add_assignment_context_fields');

     // Verify schema
     const columns = await getTableColumns('assignment_areas');
     expect(columns).toContain('referenceFileIds');
     expect(columns).toContain('customGradingPrompt');

     const grColumns = await getTableColumns('grading_results');
     expect(grColumns).toContain('assignmentAreaId');
   });
   ```

2. **Backward Compatibility Test**:

   ```typescript
   test('existing assignments load without errors', async () => {
     // Create assignment without new fields (old behavior)
     const assignment = await prisma.assignmentArea.create({
       data: { name: 'Test', courseId, rubricId },
     });

     // Query should work
     const fetched = await prisma.assignmentArea.findUnique({
       where: { id: assignment.id },
     });

     expect(fetched.referenceFileIds).toBeNull();
     expect(fetched.customGradingPrompt).toBeNull();
   });
   ```

3. **JSON Array Validation Test**:

   ```typescript
   test('reference file IDs stored and retrieved correctly', async () => {
     const fileIds = [uuid(), uuid()];

     const assignment = await prisma.assignmentArea.create({
       data: {
         name: 'Test',
         courseId,
         rubricId,
         referenceFileIds: JSON.stringify(fileIds),
       },
     });

     const fetched = await prisma.assignmentArea.findUnique({
       where: { id: assignment.id },
     });

     const retrieved = JSON.parse(fetched.referenceFileIds);
     expect(retrieved).toEqual(fileIds);
   });
   ```

4. **Foreign Key Constraint Test**:

   ```typescript
   test('grading result links to assignment', async () => {
     const assignment = await createAssignment();

     const result = await prisma.gradingResult.create({
       data: {
         uploadedFileId,
         rubricId,
         gradingSessionId,
         assignmentAreaId: assignment.id, // New field
       },
       include: { assignmentArea: true },
     });

     expect(result.assignmentArea.id).toBe(assignment.id);
   });
   ```

5. **SetNull Cascade Test**:

   ```typescript
   test('deleting assignment sets grading result link to null', async () => {
     const assignment = await createAssignment();
     const result = await createGradingResult({ assignmentAreaId: assignment.id });

     // Delete assignment
     await prisma.assignmentArea.delete({ where: { id: assignment.id } });

     // Grading result still exists but link is null
     const fetched = await prisma.gradingResult.findUnique({
       where: { id: result.id },
     });

     expect(fetched).not.toBeNull();
     expect(fetched.assignmentAreaId).toBeNull();
   });
   ```

---

## Summary

**Schema Changes**:

-   2 new nullable fields in `AssignmentArea`
-   1 new nullable field + 1 index in `GradingResult`
-   0 changes to `UploadedFile` or `Submission`

**Backward Compatibility**:

-   All existing queries continue to work
-   Existing assignments grade without context (current behavior)
-   No data migration required

**Performance Impact**:

-   Minimal (<1ms added latency per grading)
-   Efficient JSON storage for 1-5 file IDs
-   Indexed foreign key for fast JOINs

**Next Steps**:

- Run migration in development environment
- Verify zero impact on existing grading flows
- Proceed to Phase 1 API contracts
