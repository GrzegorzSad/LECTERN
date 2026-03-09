import { Module } from '@nestjs/common';
import { PrivateChatsService } from './private-chats.service';
import { PrivateChatsController } from './private-chats.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrivateChatMessagesController } from 'src/messages/private-chat-messages.controller';
import { MessagesModule } from 'src/messages/messages.module';

@Module({
  imports: [PrismaModule, MessagesModule],
  controllers: [PrivateChatsController, PrivateChatMessagesController],
  providers: [PrivateChatsService],
})
export class PrivateChatsModule {}