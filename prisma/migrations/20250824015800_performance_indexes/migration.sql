-- Performance optimization indexes for chat system
-- Created: 2025-08-24
-- Note: Using actual table names (lowercase) and regular CREATE INDEX for Prisma compatibility

-- Index for chat list queries (user's chats ordered by update time)
CREATE INDEX IF NOT EXISTS "idx_chats_user_updated" 
ON "chats"("userId", "updatedAt" DESC);

-- Index for message queries (chat messages ordered by creation time)  
CREATE INDEX IF NOT EXISTS "idx_messages_chat_time"
ON "messages"("chatId", "time" DESC);

-- Index for user authentication queries
CREATE INDEX IF NOT EXISTS "idx_users_email"
ON "users"("email") WHERE "email" IS NOT NULL;

-- Composite index for finding user's recent messages
CREATE INDEX IF NOT EXISTS "idx_messages_chat_role_time"
ON "messages"("chatId", "role", "time" DESC);

-- Index for AI response tracking
CREATE INDEX IF NOT EXISTS "idx_messages_ai_responses"  
ON "messages"("chatId", "role", "time" DESC) WHERE "role" = 'AI';

-- Composite index for efficient chat access patterns
CREATE INDEX IF NOT EXISTS "idx_chats_user_id_updated"
ON "chats"("userId", "id", "updatedAt" DESC);