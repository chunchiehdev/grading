-- AlterTable
ALTER TABLE "grading_results" ADD COLUMN     "agentExecutionTime" INTEGER,
ADD COLUMN     "agentModel" VARCHAR(100),
ADD COLUMN     "agentSteps" JSONB,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION,
ADD COLUMN     "requiresReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "toolCalls" JSONB;

-- CreateTable
CREATE TABLE "agent_execution_logs" (
    "id" TEXT NOT NULL,
    "gradingResultId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "toolName" VARCHAR(100),
    "toolInput" JSONB,
    "toolOutput" JSONB,
    "reasoning" TEXT,
    "durationMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_execution_logs_gradingResultId_stepNumber_idx" ON "agent_execution_logs"("gradingResultId", "stepNumber");

-- CreateIndex
CREATE INDEX "grading_results_requiresReview_createdAt_idx" ON "grading_results"("requiresReview", "createdAt");

-- AddForeignKey
ALTER TABLE "agent_execution_logs" ADD CONSTRAINT "agent_execution_logs_gradingResultId_fkey" FOREIGN KEY ("gradingResultId") REFERENCES "grading_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
