import { Controller, Get, Query, Req, UseGuards, Param } from '@nestjs/common';
import { OneDriveService } from './onedrive.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import type { Request } from 'express';
import { ListFilesOnedriveDto } from './dto/list-files-onedrive.dto';

@Controller('onedrive')
@UseGuards(SessionAuthGuard)
export class OneDriveController {
  constructor(private readonly service: OneDriveService) {}

  @Get('list')
  listFiles(@Req() req: Request, @Query() query: ListFilesOnedriveDto) {
    return this.service.listFiles(req.session.user!.id, query.folderId);
  }

  @Get('metadata/:itemId')
  getMetadata(@Req() req: Request, @Param('itemId') itemId: string) {
    return this.service.getFileMetadata(req.session.user!.id, itemId);
  }
}