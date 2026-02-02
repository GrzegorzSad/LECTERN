import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { RagService } from './rag/rag.service';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, DocumentsModule],
  controllers: [AppController],
  providers: [AppService, RagService],
})
export class AppModule {}
