-- Add teacher review fields for IRR pairing (Gemini vs Human)
ALTER TABLE "submissions"
ADD COLUMN "humanScore" DOUBLE PRECISION,
ADD COLUMN "humanRaterId" TEXT,
ADD COLUMN "humanRatedAt" TIMESTAMP(3);

CREATE INDEX "submissions_humanRatedAt_idx" ON "submissions"("humanRatedAt");
