-- CreateTable: Class/Section system
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "schedule" JSONB,
    "capacity" INTEGER,
    "assistantId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add new fields to courses
ALTER TABLE "courses" ADD COLUMN "code" VARCHAR(50);
ALTER TABLE "courses" ADD COLUMN "syllabus" TEXT;

-- AlterTable: Add classId to assignment_areas
ALTER TABLE "assignment_areas" ADD COLUMN "classId" TEXT;

-- AlterTable: Update enrollments to support class enrollment
ALTER TABLE "enrollments" ADD COLUMN "classId" TEXT;
ALTER TABLE "enrollments" ADD COLUMN "finalGrade" DOUBLE PRECISION;
ALTER TABLE "enrollments" ADD COLUMN "attendance" JSONB;

-- AlterTable: Add classId to invitation_codes
ALTER TABLE "invitation_codes" ADD COLUMN "classId" TEXT;

-- CreateIndex
CREATE INDEX "classes_courseId_idx" ON "classes"("courseId");
CREATE INDEX "classes_assistantId_idx" ON "classes"("assistantId");
CREATE INDEX "courses_code_idx" ON "courses"("code");
CREATE INDEX "assignment_areas_classId_idx" ON "assignment_areas"("classId");
CREATE INDEX "enrollments_classId_idx" ON "enrollments"("classId");
CREATE INDEX "invitation_codes_classId_idx" ON "invitation_codes"("classId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignment_areas" ADD CONSTRAINT "assignment_areas_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: Do NOT create unique constraint on (studentId, classId) because classId is nullable
-- This constraint was intentionally removed from schema to avoid issues with NULL values