# Feature Specification: AI Grading Prompt Quality Monitor

**Feature Branch**: `005-prompt-quality-monitor`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "你可以知道今天我們去評分階段的時候，我們拿了哪一些 prompt 給大型語言模型，那他的回應的品質目前會是如何? 也就是 Prompt 是好或是不好? 如果不好我們能夠如何的優化?還是說應該要優化老師設定的評分標準字數"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Actual Prompt Sent to AI (Priority: P1)

When a teacher reviews a graded submission, they need to see the exact prompt that was sent to the AI model to understand what context and instructions the AI received.

**Why this priority**: This is the foundation for all quality assessment - teachers cannot evaluate prompt quality or debug issues without seeing the actual prompt. This provides immediate transparency and builds trust in the AI grading system.

**Independent Test**: Can be fully tested by clicking on any graded submission and viewing a "Show Prompt Details" section that displays the complete prompt text, reference documents used, and custom instructions included.

**Acceptance Scenarios**:

1. **Given** a teacher is viewing a graded submission, **When** they click "View Prompt Details", **Then** they see the complete prompt text including student content, rubric criteria, reference documents (with truncation indicators), and custom instructions
2. **Given** a submission was graded without reference documents, **When** viewing prompt details, **Then** the reference documents section shows "未使用參考文件" (No reference documents used)
3. **Given** a submission used truncated reference files, **When** viewing prompt details, **Then** each truncated file shows a warning indicator with the original length and truncated length

---

### User Story 2 - Review AI Response Quality Metrics (Priority: P1)

Teachers need to quickly assess whether AI responses are high-quality by viewing objective quality metrics including completeness, score distribution, and feedback length.

**Why this priority**: Without automated quality metrics, teachers must manually read every AI response to spot problems. This story provides instant red flags for problematic AI responses (e.g., all zeros, missing feedback, incomplete criteria coverage).

**Independent Test**: Can be fully tested by viewing any graded submission's quality metrics panel showing: criteria coverage percentage, feedback word count per criterion, score distribution pattern, and overall quality score.

**Acceptance Scenarios**:

1. **Given** a graded submission, **When** teacher views quality metrics, **Then** they see criteria coverage (X/Y criteria scored), average feedback length, score distribution (how many criteria got 0, mid-range, max scores), and quality indicators (red/yellow/green)
2. **Given** an AI response with all zero scores, **When** viewing quality metrics, **Then** system shows red "異常評分模式" (Abnormal scoring pattern) warning
3. **Given** an AI response missing feedback for some criteria, **When** viewing quality metrics, **Then** system highlights "部分評分標準缺少反饋" (Some criteria missing feedback) in yellow

---

### User Story 3 - Get Optimization Recommendations (Priority: P2)

Teachers receive actionable recommendations for improving prompt quality based on analysis of their rubric structure, custom instructions, and historical AI response patterns.

**Why this priority**: Identifying problems is only half the solution - teachers need specific guidance on what to fix. This story closes the loop by providing concrete optimization suggestions.

**Independent Test**: Can be fully tested by viewing the optimization recommendations panel that analyzes rubric clarity, custom instruction effectiveness, and suggests specific improvements with before/after examples.

**Acceptance Scenarios**:

1. **Given** a teacher's rubric has vague criteria descriptions (< 20 characters), **When** viewing optimization recommendations, **Then** system suggests "評分標準描述過於簡短" (Criteria descriptions too brief) with examples of problematic criteria
2. **Given** custom instructions are too long (> 3000 characters), **When** viewing recommendations, **Then** system warns "自訂指示過長可能稀釋重點" (Custom instructions too long may dilute focus) with suggested length
3. **Given** AI frequently fails to cite reference documents, **When** viewing recommendations, **Then** system suggests adding explicit citation requirements to custom instructions with example text

---

### User Story 4 - Compare Prompt Effectiveness Across Submissions (Priority: P3)

Teachers can compare quality metrics across multiple submissions within the same assignment area to identify systemic issues versus one-off problems.

**Why this priority**: Individual submission quality might vary due to student content quality. Aggregate analysis reveals whether prompt structure itself is the issue (affects all submissions) or if specific student submissions are problematic.

**Independent Test**: Can be fully tested by viewing assignment-level analytics dashboard showing distribution of quality scores, common failure patterns, and prompt effectiveness trends over time.

**Acceptance Scenarios**:

1. **Given** multiple submissions in an assignment area, **When** teacher views aggregate analytics, **Then** they see average quality score, percentage of submissions with warnings, and most common quality issues
2. **Given** 80% of submissions show same quality warning, **When** viewing aggregate analytics, **Then** system highlights this as a systemic issue requiring prompt/rubric adjustment
3. **Given** quality metrics improve after rubric changes, **When** comparing before/after periods, **Then** system shows trend improvement with specific metric changes

---

### Edge Cases

- What happens when AI response cannot be parsed as JSON (complete failure)?

  - System should still show the raw response text and mark quality as "解析失敗" (Parse failed)

- How does system handle very long prompts (> 10,000 tokens)?

  - Quality metrics should include "上下文過長" (Context too long) warning with token count

- What if reference documents are in different languages than rubric?

  - System should detect language mismatch and flag as potential quality issue

- How to handle edge case where rubric criteria IDs don't match AI response criteria IDs?

  - Quality metric should show "評分標準不匹配" (Criteria mismatch) with list of missing IDs

- What if teacher modifies rubric after submissions are graded?
  - Historical prompt/response data should remain immutable; quality analysis uses criteria from grading time

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store the complete prompt text sent to AI models for every grading operation
- **FR-002**: System MUST calculate and store quality metrics for every AI response including: criteria coverage rate, feedback completeness score, score distribution pattern, and response parsing status
- **FR-003**: Teachers MUST be able to view the complete prompt details for any graded submission including all sections (system instructions, student content, rubric, reference documents, custom instructions)
- **FR-004**: System MUST display quality indicators (red/yellow/green) based on configurable thresholds for metrics like criteria coverage, feedback length, and score patterns
- **FR-005**: System MUST detect and warn about abnormal scoring patterns including: all zero scores, all maximum scores, identical scores across criteria, and missing feedback
- **FR-006**: System MUST generate optimization recommendations based on analysis of rubric structure (criteria description length, clarity), custom instruction length, and reference document usage patterns
- **FR-007**: Teachers MUST be able to view aggregate quality analytics across all submissions in an assignment area including average metrics and common issues
- **FR-008**: System MUST track prompt metadata including: total token count, number of reference documents included, truncation status, custom instructions presence, and AI provider used
- **FR-009**: System MUST preserve historical prompt and response data even if rubric or assignment area is modified or deleted
- **FR-010**: System MUST highlight specific optimization opportunities with before/after examples such as "Criteria 2.1 description only 15 characters - suggest minimum 50"

### Key Entities

- **Prompt Log**: Complete record of prompt sent to AI including all components (system instruction, student content, rubric text, reference documents, custom instructions), token count, generation timestamp, target AI provider
- **Quality Metrics**: Calculated indicators for an AI response including criteria coverage rate (percentage of criteria that received scores), feedback completeness (percentage of criteria with non-empty feedback), average feedback word count, score distribution (count of 0/low/mid/high/max scores), quality score (0-100 composite), and warning flags
- **Optimization Recommendation**: Actionable suggestion for improving prompt quality including issue type (rubric clarity, instruction length, context size), severity (info/warning/critical), affected component (which criteria or instruction section), suggested improvement text, and optional before/after example
- **Aggregate Quality Report**: Summary statistics for an assignment area including average quality score across submissions, distribution of warning types, trend over time (if multiple grading sessions), and systemic issue detection

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Teachers can view complete prompt details for any submission within 2 clicks from the submission view
- **SC-002**: Quality metrics are calculated and displayed for 100% of graded submissions automatically
- **SC-003**: System detects and flags at least 5 common quality issues (all zeros, missing feedback, criteria mismatch, context too long, vague criteria descriptions)
- **SC-004**: Optimization recommendations provide specific actionable changes (not generic advice) in at least 80% of cases where quality warnings exist
- **SC-005**: Aggregate analytics enable teachers to identify systemic prompt issues by comparing metrics across at least 10 submissions
- **SC-006**: Teachers can understand prompt quality status at a glance using color-coded indicators (red/yellow/green) without reading detailed metrics
- **SC-007**: System preserves prompt history enabling teachers to compare quality before and after rubric changes across multiple grading sessions

## Assumptions

- Teachers are familiar with basic AI concepts like "prompt" and "context" from using the existing grading system
- Quality issues are primarily caused by rubric clarity, custom instruction effectiveness, and context size rather than AI model defects
- Teachers prefer automated quality checks over manual review of every AI response
- Standard quality thresholds work for most use cases: criteria coverage > 90% (green), 70-90% (yellow), < 70% (red); feedback length > 30 words (green), 15-30 (yellow), < 15 (red)
- Optimization recommendations should be specific to this educational grading context rather than general AI prompt engineering advice
- Historical data retention follows existing system policies (no special compliance requirements for prompt logs)
- Teachers access quality monitoring through submission review flow rather than separate dedicated page

## Out of Scope

- Automated prompt optimization (system suggests changes but doesn't auto-apply them)
- A/B testing different prompts against same submission
- Real-time prompt preview before grading (quality analysis is post-grading only)
- Integration with external prompt engineering tools or platforms
- Natural language quality assessment of feedback (tone, helpfulness) - only objective metrics
- Comparison across different assignment areas with different rubrics
- Student-facing prompt transparency (this feature is teacher-only)
- Automated re-grading when prompt quality issues are detected
