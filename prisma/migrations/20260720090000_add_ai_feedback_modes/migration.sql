CREATE TYPE "AiFeedbackMode" AS ENUM ('COMMENT_ONLY', 'THINKING_VISIBLE', 'THINKING_CHALLENGE');

ALTER TABLE "assignment_areas"
ADD COLUMN "aiFeedbackMode" "AiFeedbackMode" NOT NULL DEFAULT 'THINKING_CHALLENGE';

ALTER TABLE "grading_results"
ADD COLUMN "aiFeedbackMode" "AiFeedbackMode" NOT NULL DEFAULT 'THINKING_CHALLENGE';

ALTER TABLE "submissions"
ADD COLUMN "aiFeedbackMode" "AiFeedbackMode" NOT NULL DEFAULT 'THINKING_CHALLENGE',
ADD COLUMN "feedbackAcceptance" JSONB;

CREATE TABLE "assignment_feedback_mode_overrides" (
    "id" TEXT NOT NULL,
    "assignmentAreaId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mode" "AiFeedbackMode" NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_feedback_mode_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignment_feedback_mode_overrides_assignmentAreaId_studentId_key"
ON "assignment_feedback_mode_overrides"("assignmentAreaId", "studentId");

CREATE INDEX "assignment_feedback_mode_overrides_studentId_idx"
ON "assignment_feedback_mode_overrides"("studentId");

CREATE INDEX "assignment_feedback_mode_overrides_assignedById_idx"
ON "assignment_feedback_mode_overrides"("assignedById");

CREATE INDEX "assignment_feedback_mode_overrides_mode_idx"
ON "assignment_feedback_mode_overrides"("mode");

ALTER TABLE "assignment_feedback_mode_overrides"
ADD CONSTRAINT "assignment_feedback_mode_overrides_assignmentAreaId_fkey"
FOREIGN KEY ("assignmentAreaId") REFERENCES "assignment_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_feedback_mode_overrides"
ADD CONSTRAINT "assignment_feedback_mode_overrides_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_feedback_mode_overrides"
ADD CONSTRAINT "assignment_feedback_mode_overrides_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
