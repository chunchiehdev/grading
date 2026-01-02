-- AlterTable
ALTER TABLE "agent_chat_sessions" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "agent_chat_sessions_userId_isDeleted_lastActivity_idx" ON "agent_chat_sessions"("userId", "isDeleted", "lastActivity");
