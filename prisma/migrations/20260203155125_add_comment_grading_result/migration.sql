-- CreateTable
CREATE TABLE "comment_grading_results" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "normalizedScore" DOUBLE PRECISION,
    "thoughtSummary" TEXT,
    "thinkingProcess" TEXT,
    "gradingRationale" TEXT,
    "gradingModel" VARCHAR(100),
    "gradingTokens" INTEGER,
    "gradingDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_grading_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_grading_results_commentId_key" ON "comment_grading_results"("commentId");

-- CreateIndex
CREATE INDEX "comment_grading_results_graderId_idx" ON "comment_grading_results"("graderId");

-- CreateIndex
CREATE INDEX "comment_grading_results_rubricId_idx" ON "comment_grading_results"("rubricId");

-- AddForeignKey
ALTER TABLE "comment_grading_results" ADD CONSTRAINT "comment_grading_results_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "course_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_grading_results" ADD CONSTRAINT "comment_grading_results_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_grading_results" ADD CONSTRAINT "comment_grading_results_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
