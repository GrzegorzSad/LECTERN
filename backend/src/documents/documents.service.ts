import { Injectable, BadRequestException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly ragService: RagService,
    private readonly prisma: PrismaService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadDocument(
    file: Express.Multer.File | undefined,
    userId: number,
    groupId: number,
    sourceId?: number,
    link?: string,
  ) {
    if (file && link) {
      throw new BadRequestException('Provide file OR link, not both');
    }

    if (!file && !link) {
      throw new BadRequestException('file or link required');
    }

    if (file) {
      return this.uploadFile(file, userId, groupId, sourceId);
    }

    return this.linkFile(link!, userId, groupId, sourceId);
  }

  private async uploadFile(
    file: Express.Multer.File,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const dbFile = await this.prisma.file.create({
      data: {
        name: file.originalname,
        path: filePath,
        mimeType: file.mimetype,
        size: file.size,
        userId,
        groupId,
        sourceId,
        isLinked: false,
      },
    });

    const ragResult = await this.ragService.forwardFile(
      file,
      userId,
      groupId,
      sourceId,
      dbFile.id,
    );

    return {
      file: dbFile,
      rag: ragResult,
    };
  }

  private async linkFile(
    link: string,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    // const dbFile = await this.prisma.file.create({
    //   data: {
    //     name: link,
    //     info: 'linked source',
    //     isLinked: true,
    //     userId,
    //     groupId,
    //     sourceId,
    //   },
    // });

    return {
    //   file: dbFile,
      rag: 'this endpoint does not function yet',
    };
  }
}
