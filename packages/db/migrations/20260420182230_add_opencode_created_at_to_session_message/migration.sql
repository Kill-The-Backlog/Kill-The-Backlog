/*
  Warnings:

  - Added the required column `opencodeCreatedAt` to the `SessionMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SessionMessage" ADD COLUMN     "opencodeCreatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "SessionMessage_sessionId_opencodeCreatedAt_idx" ON "SessionMessage"("sessionId", "opencodeCreatedAt");
