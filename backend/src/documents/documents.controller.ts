import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { UploadDocumentDto } from './dto/upload-documents.dto';
import { LinkDocumentDto } from './dto/link-documents.dto';
import type { Request } from 'express';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(SessionAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a file with metadata',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        groupId: { type: 'number' },
        sourceId: { type: 'number' },
        link: { type: 'string' },
      },
      required: ['file', 'groupId'],
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new Error('file required');
    }
    const userId = req.session.user!.id;
    return this.documentsService.uploadDocument(
      file,
      userId,
      dto.groupId,
      dto.sourceId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Post('link')
  @ApiBody({
    description: 'link a file hosted online',
    schema: {
      type: 'object',
      properties: {
        groupId: { type: 'number' },
        sourceId: { type: 'number' },
        link: { type: 'string' },
      },
      required: ['link', 'groupId'],
    },
  })
  link(
    @Body() dto: LinkDocumentDto,
    @Req() req: Request,
  ) {
    const userId = req.session.user!.id;
    return this.documentsService.linkDocument(
      userId,
      dto.groupId,
      dto.link,
      dto.sourceId,
    );
  }
}
