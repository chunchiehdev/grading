-- Remove backward compatibility fields from enrollments table
-- This migration completes the transition to class-based enrollment system

-- Step 1: Drop unique constraint on (studentId, courseId)
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_studentId_courseId_key";

-- Step 2: Drop index on courseId
DROP INDEX IF EXISTS "enrollments_courseId_idx";

-- Step 3: Drop foreign key constraint to courses
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_courseId_fkey";

-- Step 4: Drop courseId column (backward compatibility field)
ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "courseId";

-- Step 5: Make classId NOT NULL (now required)
-- Note: This assumes all existing enrollments have classId populated
ALTER TABLE "enrollments" ALTER COLUMN "classId" SET NOT NULL;

-- Step 6: Add unique constraint on (studentId, classId)
-- This prevents duplicate enrollments in the same class
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_classId_key" UNIQUE ("studentId", "classId");
