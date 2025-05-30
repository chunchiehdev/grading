-- CreateEnum
CREATE TYPE "GradingSessionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FileParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GradingSessionStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "originalFileName" VARCHAR(500) NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "parseStatus" "FileParseStatus" NOT NULL DEFAULT 'PENDING',
    "parsedContent" TEXT,
    "parseError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_results" (
    "id" TEXT NOT NULL,
    "gradingSessionId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "status" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "errorMessage" TEXT,
    "gradingModel" VARCHAR(100),
    "gradingTokens" INTEGER,
    "gradingDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "grading_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "rubrics_userId_isActive_idx" ON "rubrics"("userId", "isActive");

-- CreateIndex
CREATE INDEX "grading_sessions_userId_status_idx" ON "grading_sessions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_fileKey_key" ON "uploaded_files"("fileKey");

-- CreateIndex
CREATE INDEX "uploaded_files_userId_parseStatus_idx" ON "uploaded_files"("userId", "parseStatus");

-- CreateIndex
CREATE INDEX "uploaded_files_expiresAt_idx" ON "uploaded_files"("expiresAt");

-- CreateIndex
CREATE INDEX "grading_results_gradingSessionId_status_idx" ON "grading_results"("gradingSessionId", "status");

-- CreateIndex
CREATE INDEX "grading_results_uploadedFileId_idx" ON "grading_results"("uploadedFileId");

-- CreateIndex
CREATE INDEX "grading_results_rubricId_idx" ON "grading_results"("rubricId");

-- AddForeignKey
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_sessions" ADD CONSTRAINT "grading_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_results" ADD CONSTRAINT "grading_results_gradingSessionId_fkey" FOREIGN KEY ("gradingSessionId") REFERENCES "grading_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_results" ADD CONSTRAINT "grading_results_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_results" ADD CONSTRAINT "grading_results_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
