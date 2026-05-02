-- CreateTable
CREATE TABLE "submission_ai_feedback_comments" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(255) NOT NULL,
    "annotationId" VARCHAR(255) NOT NULL,
    "quote" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_ai_feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_ai_feedback_comments_annotationId_key" ON "submission_ai_feedback_comments"("annotationId");

-- CreateIndex
CREATE INDEX "submission_ai_feedback_comments_submissionId_idx" ON "submission_ai_feedback_comments"("submissionId");

-- CreateIndex
CREATE INDEX "submission_ai_feedback_comments_teacherId_idx" ON "submission_ai_feedback_comments"("teacherId");

-- CreateIndex
CREATE INDEX "submission_ai_feedback_comments_submissionId_targetType_tar_idx" ON "submission_ai_feedback_comments"("submissionId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "submission_ai_feedback_comments" ADD CONSTRAINT "submission_ai_feedback_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_ai_feedback_comments" ADD CONSTRAINT "submission_ai_feedback_comments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
