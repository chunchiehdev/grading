-- CreateTable
CREATE TABLE "grading_tasks" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "feedback" JSONB,
    "metadata" JSONB,

    CONSTRAINT "grading_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grading_tasks_authorId_idx" ON "grading_tasks"("authorId");

-- CreateIndex
CREATE INDEX "grading_tasks_status_idx" ON "grading_tasks"("status");

