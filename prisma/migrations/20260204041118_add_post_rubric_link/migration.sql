-- AlterTable
ALTER TABLE "course_posts" ADD COLUMN     "rubricId" TEXT;

-- CreateIndex
CREATE INDEX "course_posts_rubricId_idx" ON "course_posts"("rubricId");

-- AddForeignKey
ALTER TABLE "course_posts" ADD CONSTRAINT "course_posts_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
