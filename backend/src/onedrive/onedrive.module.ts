import { Module } from '@nestjs/common';
import { OneDriveService } from './onedrive.service';
import { OneDriveController } from './onedrive.controller';
import { LinkedAccountsService } from 'src/linked-accounts/linked-accounts.service';


@Module({
  controllers: [OneDriveController],
  providers: [OneDriveService, LinkedAccountsService],
  exports: [OneDriveService]
})
export class OneDriveModule {}
