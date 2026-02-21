import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { RagService } from './rag/rag.service';
import { GroupsModule } from './groups/groups.module';
import { LinkedAccountsController } from './linked-accounts/linked-accounts.controller';
import { LinkedAccountsService } from './linked-accounts/linked-accounts.service';
import { LinkedAccountsModule } from './linked-accounts/linked-accounts.module';
import { OneDriveController } from './onedrive/onedrive.controller';
import { OneDriveModule } from './onedrive/onedrive.module';
import { GptService } from './gpt/gpt.service';
import { GptController } from './gpt/gpt.controller';
import { GptModule } from './gpt/gpt.module';
import { MembersService } from './members/members.service';
import { MembersController } from './members/members.controller';
import { MembersModule } from './members/members.module';
import { SourcesService } from './sources/sources.service';
import { SourcesController } from './sources/sources.controller';
import { SourcesModule } from './sources/sources.module';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesModule } from './messages/messages.module';
import { ChannelsService } from './channels/channels.service';
import { ChannelsController } from './channels/channels.controller';
import { ChannelsModule } from './channels/channels.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, DocumentsModule, GroupsModule, LinkedAccountsModule, OneDriveModule, GptModule, MembersModule, SourcesModule, MessagesModule, ChannelsModule],
  controllers: [AppController, LinkedAccountsController, OneDriveController, GptController, MembersController, SourcesController, MessagesController, ChannelsController],
  providers: [AppService, RagService, LinkedAccountsService, GptService, MembersService, SourcesService, MessagesService, ChannelsService],
})
export class AppModule {}
