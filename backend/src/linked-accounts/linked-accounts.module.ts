import { Module } from '@nestjs/common';
import { LinkedAccountsController } from './linked-accounts.controller';
import { LinkedAccountsService } from './linked-accounts.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LinkedAccountsController],
  providers: [LinkedAccountsService, PrismaService],
  exports: [LinkedAccountsService],
})
export class LinkedAccountsModule {}
