# Tasks: AI Grading with Knowledge Base Context

**Feature Branch**: `004-ai-grading-context`
**Input**: Design documents from `/specs/004-ai-grading-context/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: Not explicitly requested in specification - focusing on implementation tasks. Tests can be added later if needed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

React Router v7 application structure:

- `app/routes/` - File-based routing (UI pages + API endpoints)
- `app/services/` - Business logic layer (\*.server.ts)
- `app/components/` - UI components
- `app/schemas/` - Zod validation schemas
- `app/types/` - TypeScript definitions
- `prisma/` - Database schema and migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema changes and project structure updates

- [x] T001 Create database migration for schema changes in prisma/migrations/
- [x] T002 Update Prisma schema with new fields in prisma/schema.prisma (referenceFileIds, customGradingPrompt, assignmentAreaId)
- [x] T003 [P] Create TypeScript type definitions in app/types/assignment.ts (AssignmentAreaWithReferences, ReferenceFileUsage)
- [x] T004 [P] Extend GradingRequest interface in app/types/grading.ts (add assignmentAreaId and language fields)

**Checkpoint**: Schema and types ready for implementation  

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Run database migration to apply schema changes: `npm run migrate:dev`
- [x] T006 Verify migration success by inspecting AssignmentArea and GradingResult tables in PostgreSQL
- [x] T007 [P] Update Zod validation schema in app/schemas/assignment.ts (add referenceFileIds array validation, customGradingPrompt length validation)
- [x] T008 [P] Create assignment-area service in app/services/assignment-area.server.ts (CRUD operations for reference files and instructions)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel  

---

## Phase 3: User Story 1 - Teacher Uploads Reference Materials (Priority: P1) 🎯 MVP

**Goal**: Enable teachers to upload reference documents (PDF/DOCX/TXT) and associate them with assignments

**Independent Test**: Create assignment, upload 2 reference PDFs, verify files are stored and parsed, view assignment to see reference file list with parsing status

### Implementation for User Story 1

- [x] T009 [P] [US1] Create ReferenceFileUpload component in app/components/grading/ReferenceFileUpload.tsx (multi-file upload UI with parse status indicators)
- [x] T010 [P] [US1] Create file upload progress tracking hook in app/hooks/useFileUploadProgress.ts (polls parseStatus from UploadedFile)
- [x] T011 [US1] Extend POST /api/assignments endpoint in app/api/assignments/index.ts (accept referenceFileIds array in request body)
- [x] T012 [US1] Update assignment creation validation in app/api/assignments/index.ts (validate max 5 files, verify all files have parseStatus=COMPLETED)
- [x] T013 [US1] Update teacher assignment creation UI in app/routes/teacher/assignments.create.tsx (integrate ReferenceFileUpload component)
- [x] T014 [US1] Extend GET /api/assignments/:id endpoint in app/api/assignments/$assignmentId.ts (return referenceFiles array with metadata)
- [x] T015 [US1] Update assignment detail view in app/routes/teacher/assignments.$id.tsx (display reference file list with parsing status)
- [x] T016 [US1] Add error handling for failed file parsing in ReferenceFileUpload component (show retry/remove buttons)
- [x] T017 [US1] Add logging for reference file operations in app/services/assignment-area.server.ts (upload, parse, associate)

**Checkpoint**: Teachers can upload reference materials and view parsing status - US1 complete  

---

## Phase 4: User Story 2 - Teacher Provides Custom Grading Instructions (Priority: P1)

**Goal**: Enable teachers to provide custom grading instructions for AI to follow

**Independent Test**: Create assignment, enter custom instructions (Chinese text), save, edit assignment to verify instructions are displayed

### Implementation for User Story 2

- [x] T018 [P] [US2] Create CustomInstructionsField component in app/components/teacher/CustomInstructionsField.tsx (text area with character counter, max 5000 chars)
- [x] T019 [US2] Update POST /api/assignments endpoint in app/api/assignments/index.ts (accept customGradingPrompt in request body)
- [x] T020 [US2] Add customGradingPrompt validation in app/schemas/assignment.ts (max length 5000, nullable)
- [x] T021 [US2] Update teacher assignment creation UI in app/routes/teacher/assignments.create.tsx (integrate CustomInstructionsField component)
- [x] T022 [US2] Update PATCH /api/assignments/:id endpoint in app/api/assignments/$assignmentId.ts (allow updating customGradingPrompt)
- [x] T023 [US2] Update assignment edit UI in app/routes/teacher/assignments.$id.edit.tsx (show CustomInstructionsField with saved value)
- [x] T024 [US2] Update assignment detail view in app/routes/teacher/assignments.$id.tsx (display custom instructions if present)
- [x] T025 [US2] Add logging for custom instruction operations in app/services/assignment-area.server.ts

**Checkpoint**: Teachers can provide and edit custom grading instructions - US2 complete  

---

## Phase 5: User Story 3 - Student Submission Triggers Context-Aware Grading (Priority: P1)

**Goal**: Automatically combine reference materials + custom instructions + rubric + student work into AI prompt

**Independent Test**: Submit student work to assignment with references and instructions, verify AI feedback references content from uploaded materials

### Implementation for User Story 3

- [x] T026 [US3] Update POST /api/grading/session endpoint in app/api/grading/session.ts (accept assignmentAreaId in request body)
- [x] T027 [US3] Add assignmentAreaId validation in app/api/grading/session.ts (optional UUID field)
- [x] T028 [US3] Create loadReferenceDocuments function in app/services/grading-engine.server.ts (fetch parsed content from UploadedFile, apply 8000 char truncation per file)
- [x] T029 [US3] Update processGradingResult in app/services/grading-engine.server.ts (call loadReferenceDocuments when assignmentAreaId present)
- [x] T030 [US3] Create formatReferenceDocuments helper in app/services/gemini-prompts.server.ts (format reference content as markdown sections)
- [x] T031 [US3] Create formatCustomInstructions helper in app/services/gemini-prompts.server.ts (format custom instructions section)
- [x] T032 [US3] Update generateTextGradingPrompt in app/services/gemini-prompts.server.ts (insert reference and instruction sections in correct order)
- [x] T033 [US3] Mirror prompt changes in app/services/openai-simple.server.ts (maintain fallback provider consistency)
- [x] T034 [US3] Update aiGrader.grade call in app/services/grading-engine.server.ts (pass assignmentAreaId and language)
- [x] T035 [US3] Add truncation logging in loadReferenceDocuments (warn when content exceeds 8000 chars, append truncation note)
- [x] T036 [US3] Add graceful degradation handling in processGradingResult (proceed with grading if references fail to load)
- [x] T037 [US3] Update student submission flow in app/routes/student/submit.tsx (pass assignmentAreaId to grading session API)
- [x] T038 [US3] Extend GradingResult response schema to include usedContext object (assignmentAreaId, referenceFilesUsed array, customInstructionsUsed boolean)
- [x] T039 [US3] Update GET /api/grading/session/:sessionId endpoint in app/api/grading/session.ts (return usedContext in response)
- [x] T040 [US3] Add context transparency fields to grading result display in app/routes/teacher/submissions.$id.tsx (show which references were used)

**Checkpoint**: AI grading now uses full context - feedback references uploaded materials - US3 complete  

---

## Phase 6: User Story 4 - Language-Aware Grading Feedback (Priority: P2)

**Goal**: Detect user interface language and provide AI feedback in matching language

**Independent Test**: Switch UI to English, submit work, verify feedback is English. Switch to Chinese, verify feedback is Chinese.

### Implementation for User Story 4

- [x] T041 [P] [US4] Update POST /api/grading/session endpoint in app/api/grading/session.ts (accept optional language parameter)
- [x] T042 [P] [US4] Add language validation in app/api/grading/session.ts (enum: 'zh' | 'en', nullable, default 'zh')
- [x] T043 [US4] Update student submission UI in app/routes/student/submit.tsx (detect i18n.language and pass to grading session API)
- [x] T044 [US4] Update generateTextGradingPrompt in app/services/gemini-prompts.server.ts (add language instruction to system message based on language parameter)
- [x] T045 [US4] Update OpenAI prompt generation in app/services/openai-simple.server.ts (add language instruction for consistency)
- [x] T046 [US4] Add language fallback logic in app/services/grading-engine.server.ts (default to 'zh' if language not provided)
- [x] T047 [US4] Add logging for language detection in processGradingResult (log "Grading with language: [zh/en]")

**Checkpoint**: AI feedback language matches user interface language - US4 complete  

---

## Phase 7: User Story 5 - Teacher Reviews and Overrides AI Grading (Priority: P2)

**Goal**: Show teachers which context was used for grading and allow them to override AI decisions

**Independent Test**: View graded submission as teacher, verify reference files used are displayed, successfully override AI score

### Implementation for User Story 5

- [x] T048 [P] [US5] Create ContextTransparency component in app/components/grading/ContextTransparency.tsx (display usedContext object with file names, truncation status)
- [x] T049 [US5] Update teacher submission review UI in app/routes/teacher/submissions.$id.tsx (integrate ContextTransparency component above AI feedback)
- [x] T050 [US5] Add visual indicators for context availability in submission list view in app/routes/teacher/assignments.$id.tsx (icon showing context-aware grading)
- [x] T051 [US5] Add teacher override tracking in database (reuse existing teacher feedback fields, ensure no schema changes needed)
- [x] T052 [US5] Update submission detail view to show teacher-reviewed status when teacher modifies AI grade
- [x] T053 [US5] Add logging for teacher overrides in app/services/grading-engine.server.ts (track when teacher changes AI grade)

**Checkpoint**: Teachers have full transparency and control over AI grading - US5 complete  

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T054 [P] Add comprehensive error handling for edge cases (all files fail parsing, reference file not found, token limit exceeded)
- [x] T055 [P] Add monitoring for token usage in AI prompts (log total token estimate per grading)
- [x] T056 [P] Update i18n translation files in app/locales/zh/grading.json and app/locales/en/grading.json (add keys for reference materials UI)
- [x] T057 Verify backward compatibility by testing existing assignments without references (ensure grading works unchanged)
- [x] T058 Run quickstart.md validation (follow test scenarios in quickstart.md to verify all workflows)
- [x] T059 [P] Add performance logging for reference document loading time
- [x] T060 [P] Add database indexes verification (confirm assignmentAreaId index exists on GradingResult)
- [x] T061 Code cleanup and refactoring (remove debug logs, consolidate duplicate code)
- [x] T062 Update CLAUDE.md with new patterns (document reference loading pattern, prompt composition approach)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 → US2 → US3 → US4 → US5
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent from US1, can run in parallel
- **User Story 3 (P1)**: Depends on US1 and US2 completion (needs reference files and instructions to exist)
- **User Story 4 (P2)**: Depends on US3 completion (extends grading with language detection)
- **User Story 5 (P2)**: Depends on US3 completion (displays context used in grading)

### Within Each User Story

- Models/types before services
- Services before API endpoints
- API endpoints before UI components
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T003 and T004 can run in parallel (different files)

**Phase 2 (Foundational)**: T007 and T008 can run in parallel (different files)

**Phase 3 (US1)**: T009 and T010 can run in parallel (different components)

**Phase 4 (US2)**: T018 can be developed independently while US1 is in progress (different components)

**Phase 5 (US3)**: T038 and T040 can run in parallel (schema vs endpoint)

**Phase 6 (US4)**: T041 and T042 can run in parallel (endpoint extension), T044 and T045 can run in parallel (both prompt services)

**Phase 7 (US5)**: T048 and T050 can run in parallel (different UI components)

**Phase 8 (Polish)**: T054, T055, T056, T059, T060 can all run in parallel (different concerns)

**Parallel User Stories**:

- US1 and US2 can be developed in parallel by different developers (both P1, no dependencies)
- US4 and US5 can be developed in parallel after US3 completes (both P2, independent)

---

## Parallel Example: User Story 1

```bash
# Launch parallel tasks in Phase 3:
Task T009: "Create ReferenceFileUpload component in app/components/grading/ReferenceFileUpload.tsx"
Task T010: "Create file upload progress tracking hook in app/hooks/useFileUploadProgress.ts"

# Then proceed sequentially:
Task T011: "Extend POST /api/assignments endpoint" (depends on component being ready)
Task T012: "Update validation" (depends on endpoint changes)
# ... continue in order
```

---

## Parallel Example: User Story 1 + User Story 2 Together

```bash
# Team Member A works on US1:
Task T009: ReferenceFileUpload component
Task T010: useFileUploadProgress hook
Task T011: POST /api/assignments (referenceFileIds)
# ...

# Team Member B works on US2 (in parallel):
Task T018: CustomInstructionsField component
Task T019: POST /api/assignments (customGradingPrompt)
Task T020: Validation schema
# ...

# Both can work simultaneously without conflicts (different UI components and service areas)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3 Only)

1. Complete Phase 1: Setup (4 tasks)
2. Complete Phase 2: Foundational (4 tasks) - CRITICAL checkpoint
3. Complete Phase 3: User Story 1 (9 tasks) - Teachers can upload references
4. Complete Phase 4: User Story 2 (8 tasks) - Teachers can add instructions
5. Complete Phase 5: User Story 3 (15 tasks) - AI uses full context
6. **STOP and VALIDATE**: Test complete grading workflow end-to-end
7. Deploy/demo if ready (core feature complete)

**MVP Task Count**: 4 + 4 + 9 + 8 + 15 = **40 tasks**

### Incremental Delivery

1. Setup + Foundational (8 tasks) → Foundation ready
2. Add US1 (9 tasks) → Test independently → Teachers can upload materials
3. Add US2 (8 tasks) → Test independently → Teachers can add instructions
4. Add US3 (15 tasks) → Test independently → AI grading with context works! **MVP COMPLETE**
5. Add US4 (7 tasks) → Test independently → Language detection works
6. Add US5 (6 tasks) → Test independently → Teacher transparency and override
7. Polish (9 tasks) → Final quality pass

**Total Tasks**: 62 tasks

### Parallel Team Strategy

With 2-3 developers:

1. **Week 1**: Team completes Setup + Foundational together (8 tasks)
2. **Week 2**: Once Foundational is done:
   - Developer A: User Story 1 (reference upload)
   - Developer B: User Story 2 (custom instructions)
3. **Week 3**: Both merge, then:
   - Developer A + B together: User Story 3 (AI integration) - most complex
4. **Week 4**:
   - Developer A: User Story 4 (language detection)
   - Developer B: User Story 5 (teacher review UI)
5. **Week 5**: Polish phase together

---

## Task Mapping to Requirements

### Functional Requirements Coverage

- **FR-001** (upload documents): T009, T011, T013
- **FR-002** (parse documents): Reuses existing parser, T010 tracks status
- **FR-003** (display parsing status): T010, T015, T016
- **FR-004** (custom instructions input): T018, T021
- **FR-005** (store file IDs as JSON): T002, T011, T019
- **FR-006** (store instructions): T002, T019
- **FR-007** (backward compatibility): T057
- **FR-008** (retrieve parsed content): T028
- **FR-009** (construct AI prompt): T030, T031, T032
- **FR-010** (truncate to 8000 chars): T028, T035
- **FR-011** (record used references): T038, T039
- **FR-012** (graceful degradation): T036, T054
- **FR-013** (detect language): T043, T044, T046
- **FR-014** (teacher views context): T048, T049
- **FR-015** (teacher override): T051, T052

### Success Criteria Coverage

- **SC-001** (upload time <3 min): T010 (progress tracking)
- **SC-002** (AI references materials): T032, T040 (prompt composition + verification)
- **SC-003** (backward compatibility): T057 (explicit test)
- **SC-004** (parsing time <60s): Existing parser, T010 tracks
- **SC-005** (teacher satisfaction): Measured post-deployment, enabled by T048-T053
- **SC-006** (no token overflow): T028, T035 (truncation), T055 (monitoring)
- **SC-007** (language match 95%): T041-T047
- **SC-008** (grading time <2s overhead): T059 (performance logging)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently
- Focus on MVP first (US1+US2+US3) before adding P2 features
- Test backward compatibility early and often (T057)
- Monitor token usage to prevent prompt overflow (T055)
- Reference quickstart.md for detailed test scenarios after implementation
