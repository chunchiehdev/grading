# 011-Feedback Adjudication UI

## 1. Context & Goal

Based on the *"R&D Log: The Pivot from 'AI Automated Grading' to 'Human-AI Collaborative Feedback',"*, we are shifting the core of the system from simple "AI Automated Grading" to a "Feedback Adjudication System."

**Core Philosophy:**

1. **Scores are not the focus:** The priority is telling students *how* to improve.
2. **Academic Integrity Mechanism:** By forcing students to read and respond to AI feedback, we prevent them from simply using AI to write the assignment or ignoring the feedback entirely.
3. **The Assessment Process:** The object of assessment shifts from the "final output" to "the process of how the student handles feedback."

**Goal:**
Design a brand-new student interface. After the AI completes its preliminary analysis, the student sees not a "score," but an interactive "Feedback Adjudication" task.

## 2. Core Workflow

1. **Draft Upload:** The student uploads the initial draft of the assignment.
2. **AI Analysis:** The AI analyzes the draft and generates multiple specific "Feedback Cards."
3. **Adjudication:** The student enters the "Adjudication Interface" and must make a decision on every piece of feedback:
* **Accept:** Agrees with the suggestion and commits to revising it in the final version.
* **Reject:** Disagrees with the suggestion. **Must provide a reason (50+ words)** explaining why their writing is better or why the AI misjudged.


4. **Revision & Final Submission:** The student modifies the essay based on the accepted suggestions and uploads the final version. The system can compare the differences between the draft and the final version (to verify if revisions were made).

## 3. UI Specification

### 3.1 Page Structure: Feedback Adjudication Dashboard

When a student accesses an assignment page that has been analyzed by AI, the `GradingResultDisplay` (score view) is no longer shown. Instead, the "Feedback Adjudication" view is displayed.

**Main Areas:**

1. **Status Header**
* Displays current progress: e.g., "Pending Feedback: 3/5".
* Prompt message: "Please review the following AI suggestions and decide whether to accept them. If rejecting, a reason is required."


2. **Draft Preview (Left side or Top)**
* Displays the uploaded PDF or text content.
* *(Advanced)* If feasible, clicking a feedback card should auto-scroll the preview to the relevant paragraph.


3. **Feedback Cards Stack / List (Core Interaction Area)**
* Deconstructs the AI's `breakdown` or `overallFeedback` into independent cards.
* **Card Content:**
* **Title:** Feedback Summary (e.g., "Argument lacks evidence," "Paragraph too long").
* **Detailed Suggestion:** Specific explanation from the AI.
* **Citation/Location:** Points out where the issue is in the text.


* **Action Buttons:**
* `[Accept]`: Green checkmark/button. Clicking marks it as "Accepted" and adds it to the "Revision List."
* `[Reject]`: Red cross/button. Clicking pops up/expands the "Rejection Justification Input."




4. **Rejection Justification Input**
* Appears only when "Reject" is clicked.
* Prompt: "Please explain why you are not adopting this suggestion (Minimum 50 words)."
* Word Count & Validation: Cannot submit the rejection if the word count is insufficient.


5. **Action Plan & Next Steps**
* Appears when all cards have been processed.
* Lists all "Accepted" suggestions to form a "Revision Checklist."
* Buttons: "Start Revision" or "Upload Final Version."



### 3.2 Interaction Details

* **Gamification (Micro-interactions):** After processing a card, it slides away or fades out, the progress bar advances, and immediate feedback (e.g., sound effects or visual rewards) is given to reduce the boredom of reading long feedback.
* **Safeguards (Error-proofing):** The student must process *all* feedback before they can proceed to the next step (uploading the final version).

## 4. Data Structure Changes

Need to expand `Submission` or add `FeedbackAdjudication` related models:

```typescript
interface FeedbackItem {
  id: string;
  originalFeedback: string; // Original AI feedback
  category: string; // Assessment dimension/aspect
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string; // If rejected, the student's reasoning
  studentComment?: string; // Additional student notes
}

interface AdjudicationSession {
  submissionId: string;
  items: FeedbackItem[];
  completedAt?: Date;
}

```

## 5. Implementation Phases

1. **Phase 1: UI Prototype**
* Modify `StudentSubmissionDetail`.
* Implement `FeedbackCard` component.
* Implement `AdjudicationFlow` (card switching logic).


2. **Phase 2: Data Integration**
* Convert existing AI `breakdown` into `FeedbackItem` format.
* Save student decisions (Accept/Reject).


3. **Phase 3: Integrity & Constraints**
* Implement word count validation for rejection reasons.
* Block final upload if adjudication is incomplete.



## 6. Conclusion

This interface transforms the student from a "passive grade receiver" into an "active adjudicator." By forcing the student to dialogue with the AI's perspective, we achieve the dual goals of deep learning and academic integrity.