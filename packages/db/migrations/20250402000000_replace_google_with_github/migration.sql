-- DropForeignKey
ALTER TABLE "GoogleAccount" DROP CONSTRAINT "GoogleAccount_userId_fkey";

-- DropTable
DROP TABLE "GoogleAccount";

-- CreateTable
CREATE TABLE "GitHubAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "githubId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "oauthAccessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubAccount_userId_key" ON "GitHubAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubAccount_githubId_key" ON "GitHubAccount"("githubId");

-- AddForeignKey
ALTER TABLE "GitHubAccount" ADD CONSTRAINT "GitHubAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
