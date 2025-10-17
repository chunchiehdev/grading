-- AlterTable
ALTER TABLE "assignment_areas" ADD COLUMN     "customGradingPrompt" TEXT,
ADD COLUMN     "referenceFileIds" TEXT;

-- AlterTable
ALTER TABLE "grading_results" ADD COLUMN     "assignmentAreaId" TEXT;

-- CreateIndex
CREATE INDEX "grading_results_assignmentAreaId_idx" ON "grading_results"("assignmentAreaId");

-- AddForeignKey
ALTER TABLE "grading_results" ADD CONSTRAINT "grading_results_assignmentAreaId_fkey" FOREIGN KEY ("assignmentAreaId") REFERENCES "assignment_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
