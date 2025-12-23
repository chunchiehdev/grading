-- AlterTable
ALTER TABLE "grading_results" ADD COLUMN     "gradingRationale" TEXT,
ADD COLUMN     "thinkingProcess" TEXT;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "gradingRationale" TEXT,
ADD COLUMN     "thinkingProcess" TEXT;
