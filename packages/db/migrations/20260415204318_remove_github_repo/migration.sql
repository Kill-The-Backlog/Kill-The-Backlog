/*
  Warnings:

  - You are about to drop the `GitHubRepo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GitHubRepo" DROP CONSTRAINT "GitHubRepo_userId_fkey";

-- DropTable
DROP TABLE "GitHubRepo";
