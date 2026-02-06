import { Injectable, BadRequestException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedAccountsService } from 'src/linked-accounts/linked-accounts.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import axios from 'axios';


@Injectable()
export class DocumentsService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly ragService: RagService,
    private readonly prisma: PrismaService,
    private readonly linkedAccountsService: LinkedAccountsService
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
  ) {
    return this.uploadFile(file!, userId, groupId, sourceId);
  }

  async linkDocument(
    userId: number,
    groupId: number,
    link: string,
    sourceId?: number,
  ) {
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

    return { file: dbFile, rag: ragResult };
  }

  private async linkFile(
    link: string,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    //HERE TODO if sourceid-onedrive
    const linkedAccount = await this.prisma.linkedAccount.findFirst({
      where: { userId, provider: 'microsoft' },
    });
    if (!linkedAccount)
      throw new BadRequestException('No OneDrive/microsoft account linked');

    let accessToken = linkedAccount.accessToken;
    if (linkedAccount.expiresAt <= new Date()) {
      accessToken =
        await this.linkedAccountsService.refreshMicrosoftToken(userId);
    }

    try {
      const response = await axios.get(link, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const fileBuffer = Buffer.from(response.data);
      const filename = link.split('/').pop() || `file-${Date.now()}`;
      const mimeType =
        response.headers['content-type'] || 'application/octet-stream';

      const fileLikeMulter: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: filename,
        mimetype: mimeType,
        size: fileBuffer.length,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      return this.uploadFile(fileLikeMulter, userId, groupId, sourceId);
    } catch (err) {
      console.error(
        'OneDrive download error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException('Failed to download file from OneDrive');
    }
  }

}
