-- CreateTable
CREATE TABLE "agent_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255),
    "userRole" VARCHAR(20) NOT NULL,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_chat_step_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "toolName" VARCHAR(100),
    "toolInput" JSONB,
    "toolOutput" JSONB,
    "reasoning" TEXT,
    "durationMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_chat_step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_chat_sessions_userId_createdAt_idx" ON "agent_chat_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_chat_sessions_status_idx" ON "agent_chat_sessions"("status");

-- CreateIndex
CREATE INDEX "agent_chat_sessions_userRole_idx" ON "agent_chat_sessions"("userRole");

-- CreateIndex
CREATE INDEX "agent_chat_messages_sessionId_timestamp_idx" ON "agent_chat_messages"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "agent_chat_step_logs_sessionId_stepNumber_idx" ON "agent_chat_step_logs"("sessionId", "stepNumber");

-- AddForeignKey
ALTER TABLE "agent_chat_sessions" ADD CONSTRAINT "agent_chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_chat_messages" ADD CONSTRAINT "agent_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_chat_step_logs" ADD CONSTRAINT "agent_chat_step_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
