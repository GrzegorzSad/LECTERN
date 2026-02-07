import { Injectable, BadRequestException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneDriveService } from 'src/onedrive/onedrive.service';
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
    private readonly linkedAccountsService: LinkedAccountsService,
    private readonly oneDriveService: OneDriveService,
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
    isLinked?: boolean,
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
        isLinked: isLinked,
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
    // Extract OneDrive itemId if link is a full Graph URL
    let itemId = link;
    try {
      const url = new URL(link);
      if (url.hostname === 'graph.microsoft.com') {
        // Extract the itemId from `/me/drive/items/{itemId}/content`
        const match = url.pathname.match(
          /\/me\/drive\/items\/([^\/]+)\/content/,
        );
        if (!match) throw new Error('Invalid OneDrive link format');
        itemId = match[1];
      }
    } catch {
      // If it's not a valid URL, assume it's already an itemId
      itemId = link;
    }

    // For OneDrive (assuming this will be extended with sourceId logic later)
    try {
      const fileBuffer = await this.oneDriveService.downloadFile(
        userId,
        itemId,
      );

      const fileLikeMulter: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: `onedrive-${itemId}`,
        mimetype: 'application/octet-stream',
        size: fileBuffer.length,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      return this.uploadFile(fileLikeMulter, userId, groupId, sourceId, true);
    } catch (err) {
      console.error(
        'OneDrive download error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException('Failed to download file from OneDrive');
    }
  }
}
