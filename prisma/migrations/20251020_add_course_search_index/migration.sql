-- Add index for course search performance
-- Optimizes ILIKE queries on title and description fields

CREATE INDEX idx_course_title ON "Course"("title");
CREATE INDEX idx_course_description ON "Course"("description");
