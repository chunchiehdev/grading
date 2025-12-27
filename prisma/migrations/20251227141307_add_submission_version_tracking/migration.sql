-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "isLatest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "previousVersionId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "submissions_studentId_assignmentAreaId_version_idx" ON "submissions"("studentId", "assignmentAreaId", "version");

-- CreateIndex
CREATE INDEX "submissions_isLatest_idx" ON "submissions"("isLatest");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "submissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
