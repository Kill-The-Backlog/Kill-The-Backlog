/*
  Warnings:

  - You are about to drop the `CardRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanbanCard` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CardRun" DROP CONSTRAINT "CardRun_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CardRun" DROP CONSTRAINT "CardRun_repoId_fkey";

-- DropForeignKey
ALTER TABLE "CardRun" DROP CONSTRAINT "CardRun_userId_fkey";

-- DropForeignKey
ALTER TABLE "KanbanCard" DROP CONSTRAINT "KanbanCard_repoId_fkey";

-- DropForeignKey
ALTER TABLE "KanbanCard" DROP CONSTRAINT "KanbanCard_userId_fkey";

-- DropTable
DROP TABLE "CardRun";

-- DropTable
DROP TABLE "KanbanCard";

-- DropEnum
DROP TYPE "CardRunStatus";
