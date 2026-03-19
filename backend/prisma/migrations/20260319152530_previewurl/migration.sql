/*
  Warnings:

  - You are about to alter the column `vector` on the `Chunk` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `JsonB`.
  - Made the column `vector` on table `Chunk` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "previewUrl" TEXT;
