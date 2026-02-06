import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RagModule } from 'src/rag/rag.module';
import { LinkedAccountsModule } from 'src/linked-accounts/linked-accounts.module';

@Module({
  imports: [RagModule, LinkedAccountsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
