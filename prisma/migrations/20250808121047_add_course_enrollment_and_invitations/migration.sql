-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_courseId_idx" ON "enrollments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_courseId_key" ON "enrollments"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_codes_code_key" ON "invitation_codes"("code");

-- CreateIndex
CREATE INDEX "invitation_codes_code_idx" ON "invitation_codes"("code");

-- CreateIndex
CREATE INDEX "invitation_codes_courseId_idx" ON "invitation_codes"("courseId");

-- CreateIndex
CREATE INDEX "invitation_codes_expiresAt_idx" ON "invitation_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
