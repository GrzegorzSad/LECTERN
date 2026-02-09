import { Injectable, BadRequestException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneDriveService } from 'src/onedrive/onedrive.service';
import { LinkedAccountsService } from 'src/linked-accounts/linked-accounts.service';
import { CreateChunksDto } from './dto/create-chunks.dto';
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
    remoteId?: string,
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
        remoteId,
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

    // Automatically store chunks if returned
    if (ragResult.chunks && ragResult.vectors) {
      const chunksData = ragResult.chunks.map((text: string, i: number) => ({
        fileId: dbFile.id,
        fileName: file.originalname,
        vector: ragResult.vectors[i],
        relations: null,
        entities: null,
      }));

      await this.prisma.chunk.createMany({ data: chunksData });
    }

    return { file: dbFile, rag: ragResult };
  }

  private async linkFile(
    link: string,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    let itemId = link;
    try {
      const url = new URL(link);
      if (url.hostname === 'graph.microsoft.com') {
        const match = url.pathname.match(
          /\/me\/drive\/items\/([^\/]+)\/content/,
        );
        if (!match) throw new Error('Invalid OneDrive link format');
        itemId = match[1];
      }
    } catch {
      itemId = link;
    }

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

      return this.uploadFile(
        fileLikeMulter,
        userId,
        groupId,
        sourceId,
        true,
        itemId,
      );
    } catch (err) {
      console.error(
        'OneDrive download error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException('Failed to download file from OneDrive');
    }
  }

  // Manual endpoint for storing chunks (optional)
  async storeChunks(dto: CreateChunksDto) {
    const { fileId, vectors, fileNames, relations, entities } = dto;

    const chunkRecords = vectors.map((vec, i) => ({
      fileId,
      vector: vec,
      fileName: fileNames?.[i] || `chunk-${i}`,
      relations: relations?.[i] || null,
      entities: entities?.[i] || null,
    }));

    return this.prisma.chunk.createMany({ data: chunkRecords });
  }
}
