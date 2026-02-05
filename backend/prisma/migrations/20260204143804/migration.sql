/*
  Warnings:

  - You are about to drop the column `info` on the `LinkedAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerUser]` on the table `LinkedAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accessToken` to the `LinkedAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `LinkedAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `LinkedAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerUser` to the `LinkedAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `LinkedAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LinkedAccount" DROP COLUMN "info",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "provider" TEXT NOT NULL,
ADD COLUMN     "providerUser" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_provider_providerUser_key" ON "LinkedAccount"("provider", "providerUser");
