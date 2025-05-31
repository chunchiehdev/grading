-- AlterTable
ALTER TABLE "uploaded_files" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "uploaded_files_userId_isDeleted_idx" ON "uploaded_files"("userId", "isDeleted");
