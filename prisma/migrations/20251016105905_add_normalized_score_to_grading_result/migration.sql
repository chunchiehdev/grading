-- AlterTable
ALTER TABLE "grading_results" ADD COLUMN     "normalizedScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "grading_results_normalizedScore_idx" ON "grading_results"("normalizedScore");
