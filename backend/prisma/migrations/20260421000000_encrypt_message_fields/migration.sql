-- Widen Message.media_url from VARCHAR(2048) to TEXT to accommodate
-- AES-256-GCM ciphertext overhead (encrypted S3 URLs exceed 2048 chars).
ALTER TABLE "messages" ALTER COLUMN "media_url" TYPE TEXT;

-- Widen Conversation.last_message_body from VARCHAR(500) to TEXT to accommodate
-- AES-256-GCM ciphertext overhead on the chat-list preview snippet.
ALTER TABLE "conversations" ALTER COLUMN "last_message_body" TYPE TEXT;
