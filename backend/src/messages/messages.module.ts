import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { GptModule } from '../gpt/gpt.module';
import { ChatModule } from 'src/chat/chat.module';
import { RagModule } from 'src/rag/rag.module';

@Module({
  imports: [GptModule, ChatModule, RagModule],
  controllers: [MessagesController],
  providers: [MessagesService, PrismaService],
  exports: [MessagesService],
})
export class MessagesModule {}