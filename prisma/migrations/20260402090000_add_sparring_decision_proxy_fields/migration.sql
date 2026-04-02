ALTER TABLE "submissions"
ADD COLUMN "sparringDecision" VARCHAR(10),
ADD COLUMN "sparringDecisionReason" TEXT,
ADD COLUMN "sparringDecisionAt" TIMESTAMP(3),
ADD COLUMN "sparringConvergenceShownAt" TIMESTAMP(3),
ADD COLUMN "sparringDecisionLatencyMs" INTEGER,
ADD COLUMN "sparringRoundsBeforeDecision" INTEGER;

CREATE INDEX "submissions_sparringDecision_sparringDecisionAt_idx"
ON "submissions"("sparringDecision", "sparringDecisionAt");
