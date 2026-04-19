/*
  Warnings:

  - The `lastActivityAt` column on the `Session` table is being dropped. It
    was previously written by the follow-up action but never read, and the
    sandbox supervisor that originally relied on it has been removed. The
    in-memory idle timer in the event pump now tracks activity directly.
*/
ALTER TABLE "Session" DROP COLUMN "lastActivityAt";
