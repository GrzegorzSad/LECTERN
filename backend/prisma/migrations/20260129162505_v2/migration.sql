/*
  Warnings:

  - You are about to drop the column `info` on the `Chunk` table. All the data in the column will be lost.
  - You are about to drop the column `canAddFiles` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `canCreate` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `limitAiModels` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `limitSources` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `accNeeds` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `MemberRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `role` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "MemberRole" DROP CONSTRAINT "MemberRole_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MemberRole" DROP CONSTRAINT "MemberRole_roleId_fkey";

-- AlterTable
ALTER TABLE "Chunk" DROP COLUMN "info",
ADD COLUMN     "entities" TEXT,
ADD COLUMN     "relations" TEXT;

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "canAddFiles",
DROP COLUMN "canCreate",
DROP COLUMN "limitAiModels",
DROP COLUMN "limitSources";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accNeeds",
ADD COLUMN     "img" TEXT,
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- DropTable
DROP TABLE "MemberRole";

-- DropTable
DROP TABLE "Role";
