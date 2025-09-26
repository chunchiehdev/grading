-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'DRAFT';

-- DropIndex
DROP INDEX "idx_chats_user_id_updated";

-- DropIndex
DROP INDEX "idx_chats_user_updated";

-- DropIndex
DROP INDEX "idx_messages_chat_role_time";

-- DropIndex
DROP INDEX "idx_messages_chat_time";
