/*
  Warnings:

  - You are about to drop the `SessionCommand` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SessionCommand" DROP CONSTRAINT "SessionCommand_sessionId_fkey";

-- DropTable
DROP TABLE "SessionCommand";

-- DropEnum
DROP TYPE "SessionCommandStatus";
