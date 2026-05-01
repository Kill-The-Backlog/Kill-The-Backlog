-- Renames `lastActivityAt` (any session activity) to `lastUserMessageAt`,
-- narrowing the semantic to "when the user last sent a prompt." Using
-- ALTER TABLE ... RENAME COLUMN preserves any values already populated by
-- the previous migration's default.
ALTER TABLE "Session" RENAME COLUMN "lastActivityAt" TO "lastUserMessageAt";
