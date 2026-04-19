/*
  Renames the `Session.prompt` column to `initialPrompt`. The field stores
  the user's first prompt (the one that created the session). Subsequent
  prompts live in `SessionMessage`, so the unqualified name was ambiguous.
*/
ALTER TABLE "Session" RENAME COLUMN "prompt" TO "initialPrompt";
