
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "privateChatId" INTEGER,
ALTER COLUMN "channelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PrivateChat" ADD COLUMN     "name" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_privateChatId_fkey" FOREIGN KEY ("privateChatId") REFERENCES "PrivateChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
