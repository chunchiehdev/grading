-- AlterTable
ALTER TABLE "grading_results" ADD COLUMN     "consensusMetrics" JSONB,
ADD COLUMN     "isMultiModelJudged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "judge_attempts" (
    "id" TEXT NOT NULL,
    "gradingResultId" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "modelName" VARCHAR(100) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "result" JSONB,
    "agentSteps" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "judge_attempts_gradingResultId_provider_idx" ON "judge_attempts"("gradingResultId", "provider");

-- CreateIndex
CREATE INDEX "judge_attempts_provider_success_idx" ON "judge_attempts"("provider", "success");

-- CreateIndex
CREATE INDEX "judge_attempts_gradingResultId_success_idx" ON "judge_attempts"("gradingResultId", "success");

-- CreateIndex
CREATE INDEX "grading_results_isMultiModelJudged_idx" ON "grading_results"("isMultiModelJudged");

-- AddForeignKey
ALTER TABLE "judge_attempts" ADD CONSTRAINT "judge_attempts_gradingResultId_fkey" FOREIGN KEY ("gradingResultId") REFERENCES "grading_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
