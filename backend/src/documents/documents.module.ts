import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RagModule } from 'src/rag/rag.module';
import { LinkedAccountsModule } from 'src/linked-accounts/linked-accounts.module';
import { OneDriveService } from 'src/onedrive/onedrive.service';

@Module({
  imports: [RagModule, LinkedAccountsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, OneDriveService]
})
export class DocumentsModule {}
