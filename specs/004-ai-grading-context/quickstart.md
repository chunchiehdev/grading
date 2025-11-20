# Quick Start Guide: AI Grading with Knowledge Base Context

**Feature**: Context-Aware AI Grading
**Branch**: `004-ai-grading-context`
**Last Updated**: 2025-01-16

## Overview

This guide shows developers how to test the context-aware AI grading feature locally, including reference file upload, custom instruction configuration, and full grading workflow with knowledge base integration.

## Prerequisites

### Environment Setup

**No additional environment variables required** - this feature reuses existing infrastructure:

-   Database: `DATABASE_URL` (existing PostgreSQL)
-   Storage: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (existing)
-   AI: `GOOGLE_API_KEY`, `OPENAI_API_KEY` (existing)
-   PDF Parser: External API endpoint (existing)
-   Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (existing)

### Start Development Environment

```bash
# Start all services (PostgreSQL, Redis, MinIO)
docker compose -f docker-compose.dev.yaml up -d

# Run database migrations (includes new schema changes)
npm run migrate:dev

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173` (Vite dev server).

## Sample Test Data

### Reference Documents for Testing

Create a test directory with sample reference files:

```bash
mkdir -p test-data/reference-files

# Sample 1: Simple text file (for quick testing)
cat > test-data/reference-files/answer-key.txt << 'EOF'
# Physics Assignment - Answer Key

## Problem 1: Newton's Second Law
Correct answer: F = ma
Expected calculation: 10kg × 2m/s² = 20N
Common mistakes to penalize:
- Forgetting unit conversion
- Using F = mv (incorrect formula)

## Problem 2: Free Fall
Correct answer: h = 1/2 × g × t²
Expected calculation: 0.5 × 9.8 × (3)² = 44.1m
Key points to check:
- Must use g = 9.8 m/s² (or 10 m/s² with explanation)
- Must show calculation steps
EOF

# Sample 2: Lecture notes (Chinese content for i18n testing)
cat > test-data/reference-files/lecture-notes.txt << 'EOF'
# 牛頓運動定律 - 課堂筆記

## 第二定律重點
F = ma 是核心公式，其中：
- F: 合外力 (單位: 牛頓 N)
- m: 物體質量 (單位: 公斤 kg)
- a: 加速度 (單位: 米/秒² m/s²)

## 常見錯誤
1. 忘記單位換算（例如：克換算成公斤）
2. 混淆速度與加速度
3. 計算時忽略方向性

## 評分重點
- 公式寫對：2分
- 單位正確：1分
- 計算過程：2分
- 最終答案：3分
EOF
```

### Custom Grading Instructions (Example)

```
重點檢查以下項目：
1. 學生是否正確套用 F=ma 公式
2. 單位換算是否正確（特別注意克→公斤）
3. 計算步驟是否完整（不接受只有最終答案）
4. 數值計算是否準確（允許四捨五入到小數點後一位）

評分從寬原則：
- 如果學生顯示理解概念但計算錯誤，給予部分分數
- 如果學生使用合理的近似值（如 g=10），不扣分
```

## Testing Workflow

### Step 1: Teacher Creates Assignment with Context

1. **Login as Teacher**:

   ```
   Navigate to: http://localhost:5173/teacher/login
   Use Google OAuth (development mode)
   ```

2. **Navigate to Assignment Creation**:

   ```
   Dashboard → Courses → Select Course → Create Assignment
   ```

3. **Upload Reference Files**:

   - Click "Add Reference Materials" button
   - Upload `test-data/reference-files/answer-key.txt`
   - Upload `test-data/reference-files/lecture-notes.txt`
   - Wait for parsing status: "Parsing..." → "✓ Parsed"
   - **Expected behavior**: Each file shows individual status indicator
   - **Expected time**: ~5-10 seconds for TXT files, ~30-60 seconds for PDFs

4. **Add Custom Instructions**:

   - Scroll to "Custom Grading Instructions" field
   - Paste the sample instructions above
   - **Expected behavior**: Character counter shows "245 / 5000 characters"

5. **Complete Assignment Creation**:
   - Fill in standard fields (name, rubric, due date)
   - Click "Create Assignment"
   - **Expected response**:
     ```json
     {
       "success": true,
       "data": {
         "id": "uuid-here",
         "referenceFileIds": ["uuid-1", "uuid-2"],
         "customGradingPrompt": "重點檢查以下項目...",
         "referenceFiles": [
           {
             "id": "uuid-1",
             "originalFileName": "answer-key.txt",
             "parseStatus": "COMPLETED",
             "fileSize": 450
           },
           {
             "id": "uuid-2",
             "originalFileName": "lecture-notes.txt",
             "parseStatus": "COMPLETED",
             "fileSize": 380
           }
         ]
       }
     }
     ```

### Step 2: Student Submits Work

1. **Login as Student**:

   ```
   Navigate to: http://localhost:5173/student/login
   Join course with invitation code
   ```

2. **Submit File**:
   - Navigate to assignment
   - Upload submission file (PDF/DOCX/TXT)
   - **Expected behavior**: File uploads and queues for grading

### Step 3: Verify Context-Aware Grading

1. **Monitor Grading Progress**:

   ```bash
   # Watch Redis for progress updates
   docker exec -it grading-redis redis-cli
   > KEYS grading:progress:*
   > GET grading:progress:<session-id>
   ```

2. **Check Database for Context Usage**:

   ```sql
   -- Connect to PostgreSQL
   docker exec -it grading-postgres psql -U grading_admin -d grading_db

   -- Verify GradingResult has assignmentAreaId
   SELECT
     gr.id,
     gr."assignmentAreaId",
     gr.status,
     gr."normalizedScore",
     aa.name as assignment_name,
     aa."referenceFileIds",
     aa."customGradingPrompt"
   FROM "GradingResult" gr
   LEFT JOIN "AssignmentArea" aa ON gr."assignmentAreaId" = aa.id
   ORDER BY gr."createdAt" DESC
   LIMIT 5;
   ```

3. **Inspect AI Prompt (Logs)**:

   ```bash
   # View grading engine logs
   docker compose -f docker-compose.dev.yaml logs -f app | grep "Grading prompt"
   ```

   **Expected log output** (truncated for readability):

   ```
   [GradingEngine] Composing prompt with context:
   - Reference documents: 2 files
   - Custom instructions: present
   - Assignment: uuid-here
   - Language: zh

   [Prompt Preview]
   ## Reference Knowledge Base

   ### Document 1: answer-key.txt
   # Physics Assignment - Answer Key
   ## Problem 1: Newton's Second Law
   Correct answer: F = ma
   ...

   ### Document 2: lecture-notes.txt
   # 牛頓運動定律 - 課堂筆記
   ## 第二定律重點
   F = ma 是核心公式，其中：
   ...

   ## Special Grading Instructions
   重點檢查以下項目：
   1. 學生是否正確套用 F=ma 公式
   ...

   ## Grading Criteria (Rubric)
   [rubric content]

   ## Student Submission
   [student work content]
   ```

4. **Verify Response Includes Context Transparency**:

   ```bash
   # GET grading session results
   curl http://localhost:5173/api/grading/session/<session-id>
   ```

   **Expected response** (partial):

   ```json
   {
     "success": true,
     "data": {
       "sessionId": "uuid-here",
       "status": "COMPLETED",
       "results": [
         {
           "resultId": "uuid-here",
           "status": "COMPLETED",
           "result": {
             "totalScore": 85,
             "breakdown": [...]
           },
           "normalizedScore": 85.0,
           "usedContext": {
             "assignmentAreaId": "uuid-here",
             "referenceFilesUsed": [
               {
                 "fileId": "uuid-1",
                 "fileName": "answer-key.txt",
                 "contentLength": 450,
                 "wasTruncated": false
               },
               {
                 "fileId": "uuid-2",
                 "fileName": "lecture-notes.txt",
                 "contentLength": 380,
                 "wasTruncated": false
               }
             ],
             "customInstructionsUsed": true
           },
           "gradingModel": "gemini",
           "gradingDuration": 2543
         }
       ]
     }
   }
   ```

### Step 4: Test Edge Cases

#### Test 4.1: Grading Without Context (Backward Compatibility)

1. Create assignment **without** uploading reference files
2. Submit student work
3. **Expected behavior**:
   - Grading proceeds normally
   - `assignmentAreaId` is `null` in GradingResult
   - No `usedContext` object in response
   - AI uses only rubric + student work (existing behavior)

#### Test 4.2: Reference File Parsing Failure

1. Upload a corrupted PDF file
2. Wait for parse status: "❌ Parse failed"
3. Save assignment anyway
4. Submit student work and trigger grading
5. **Expected behavior**:
   - Assignment saves successfully (graceful degradation)
   - Grading proceeds with only successfully parsed files
   - `referenceFilesUsed` array excludes failed files
   - Log warning: "Reference file [uuid] parsing failed, excluding from prompt"

#### Test 4.3: Content Truncation

1. Upload a very long reference file (>8000 characters)
2. Trigger grading
3. **Expected behavior**:
   - Reference content truncated at 8000 chars
   - `wasTruncated: true` in `usedContext.referenceFilesUsed`
   - Log warning: "Reference file [filename] truncated from 15000 to 8000 characters"
   - Truncation note appended to content: "\n\n[Note: Content truncated at 8,000 characters]"

#### Test 4.4: Language Detection

1. Switch UI language to English (`i18n.changeLanguage('en')`)
2. Trigger grading
3. **Expected behavior**:

   - API request includes `"language": "en"`
   - AI feedback provided in English
   - Verify in logs: "Grading with language: en"

4. Omit language parameter in API request
5. **Expected behavior**:
   - Falls back to Chinese (`'zh'`)
   - Backward compatible with existing behavior

## API Testing with curl

### Upload Reference File

```bash
# Step 1: Upload file to get UploadedFile ID
curl -X POST http://localhost:5173/api/files/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-data/reference-files/answer-key.txt" \
  -F "purpose=reference" \
  --cookie "session=<your-session-cookie>"

# Response:
# { "success": true, "data": { "id": "file-uuid-here", "parseStatus": "PENDING" } }
```

### Create Assignment with Context

```bash
curl -X POST http://localhost:5173/api/assignments \
  -H "Content-Type: application/json" \
  --cookie "session=<your-session-cookie>" \
  -d '{
    "name": "Physics Homework 3",
    "courseId": "course-uuid",
    "rubricId": "rubric-uuid",
    "referenceFileIds": ["file-uuid-here"],
    "customGradingPrompt": "重點檢查學生是否正確套用牛頓第二定律公式 F=ma。注意單位換算和計算步驟。"
  }'
```

### Create Grading Session with Context

```bash
curl -X POST http://localhost:5173/api/grading/session \
  -H "Content-Type: application/json" \
  --cookie "session=<your-session-cookie>" \
  -d '{
    "fileId": "uploaded-file-uuid",
    "rubricId": "rubric-uuid",
    "assignmentAreaId": "assignment-uuid",
    "language": "zh"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "sessionId": "session-uuid",
#     "resultId": "result-uuid",
#     "status": "PENDING",
#     "contextAvailable": true,
#     "referenceFilesCount": 1
#   }
# }
```

### Get Grading Results

```bash
curl http://localhost:5173/api/grading/session/<session-uuid> \
  --cookie "session=<your-session-cookie>"
```

## Database Inspection

### Check Schema Migration

```sql
-- Verify new fields exist
\d "AssignmentArea"
-- Should show:
--   referenceFileIds    | text    | nullable
--   customGradingPrompt | text    | nullable

\d "GradingResult"
-- Should show:
--   assignmentAreaId | character varying(255) | nullable
--   (with index: GradingResult_assignmentAreaId_idx)
```

### Query Context Usage Statistics

```sql
-- Assignments with reference materials
SELECT
  aa.name,
  array_length(string_to_array(aa."referenceFileIds"::text, ','), 1) as file_count,
  length(aa."customGradingPrompt") as instruction_length
FROM "AssignmentArea" aa
WHERE aa."referenceFileIds" IS NOT NULL;

-- Grading results using context
SELECT
  COUNT(*) as total_gradings,
  COUNT(gr."assignmentAreaId") as context_aware_gradings,
  ROUND(COUNT(gr."assignmentAreaId")::numeric / COUNT(*) * 100, 2) as context_usage_percent
FROM "GradingResult" gr;
```

## Troubleshooting

### Issue: Reference File Stuck in "Parsing..." Status

**Symptoms**: File upload succeeds, but parseStatus remains "PROCESSING" forever.

**Diagnosis**:

```bash
# Check PDF parser API health
curl http://<pdf-parser-api>/health

# Check UploadedFile record
docker exec -it grading-postgres psql -U grading_admin -d grading_db
SELECT id, "originalFileName", "parseStatus", "parseError"
FROM "UploadedFile"
WHERE "parseStatus" = 'PROCESSING'
ORDER BY "createdAt" DESC;
```

**Solutions**:

1. Verify PDF parser API is running and accessible
2. Check file format is supported (PDF, DOCX, TXT only)
3. Retry parsing by re-uploading file
4. For testing, use TXT files (no external parser needed)

### Issue: AI Feedback Not Using Reference Content

**Symptoms**: Grading completes, but feedback doesn't reference uploaded materials.

**Diagnosis**:

```bash
# Check if context was loaded
docker compose -f docker-compose.dev.yaml logs app | grep "loadReferenceDocuments"

# Check usedContext in API response
curl http://localhost:5173/api/grading/session/<session-id> | jq '.data.results[0].usedContext'
```

**Solutions**:

1. Verify `referenceFilesUsed` array is not empty
2. Check for truncation warnings in logs
3. Ensure `assignmentAreaId` is passed to grading session API
4. Verify reference files have `parseStatus: "COMPLETED"`

### Issue: Language Mismatch in AI Feedback

**Symptoms**: UI language is English, but AI feedback is in Chinese.

**Diagnosis**:

```javascript
// In browser console
console.log(i18n.language); // Should be 'en'

// Check API request payload
// Network tab → Payload → "language" field
```

**Solutions**:

1. Ensure `language` parameter is passed in grading session API call
2. Verify i18n is initialized: `i18n.isInitialized`
3. Check fallback behavior: if language is `null`, defaults to `'zh'`

## Performance Benchmarks

Expected timings on local development environment:

| Operation                  | Expected Duration | Notes                    |
| -------------------------- | ----------------- | ------------------------ |
| TXT file upload            | < 1 second        | No parsing needed        |
| PDF file upload            | 3-5 seconds       | Upload only              |
| PDF parsing                | 30-60 seconds     | External API call        |
| Prompt composition         | < 100ms           | In-memory operation      |
| AI grading (Gemini)        | 2-5 seconds       | Network + inference      |
| Total grading with context | 2-6 seconds       | Excludes parsing (async) |

## Next Steps

After verifying the feature locally:

1. Run integration tests: `npm run test:integration`
2. Check test coverage: `npm run test:coverage`
3. Review generated `tasks.md` for implementation checklist
4. Begin Phase 2 implementation following task breakdown

## Related Documentation

- **Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research Decisions**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)
