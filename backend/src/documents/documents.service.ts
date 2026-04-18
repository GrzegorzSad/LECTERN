import { Injectable, BadRequestException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneDriveService } from 'src/onedrive/onedrive.service';
import { SourcesService } from 'src/sources/sources.service';
import { LinkedAccountsService } from 'src/linked-accounts/linked-accounts.service';
import { CreateChunksDto } from './dto/create-chunks.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(
    private readonly ragService: RagService,
    private readonly prisma: PrismaService,
    private readonly linkedAccountsService: LinkedAccountsService,
    private readonly oneDriveService: OneDriveService,
    private readonly sourcesService: SourcesService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
    this.bucket = process.env.SUPABASE_BUCKET ?? 'documents';
  }

  async getDocuments(dto: { groupId?: number; userId?: number }) {
    const where: any = {};
    if (dto.groupId) where.groupId = dto.groupId;
    if (dto.userId) where.userId = dto.userId;

    return this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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
    previewUrl?: string,
  ) {
    const ext = path.extname(file.originalname);
    const key = `${randomUUID()}${ext}`;

    if (sourceId) {
      await this.sourcesService.validateGroupSource(groupId, sourceId);
    }

    const { error: uploadError } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `Failed to upload file: ${uploadError.message}`,
      );
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(key);

    const dbFile = await this.prisma.file.create({
      data: {
        name: file.originalname,
        path: key,
        mimeType: file.mimetype,
        size: file.size,
        userId,
        groupId,
        remoteId,
        previewUrl: urlData.publicUrl,
        sourceId,
        isLinked: isLinked,
      },
    });

    // STREAMING + FIRE-AND-FORGET
    (async () => {
      try {
        const stream = this.ragService.processFileStream(file);

        for await (const batch of stream) {
          // Check for duplicate chunks by hash before inserting
          const existingHashes = await this.prisma.chunk
            .findMany({
              where: { hash: { in: batch.hashes } },
              select: { hash: true },
            })
            .then((rows) => new Set(rows.map((r) => r.hash)));

          const chunksData = batch.chunks
            .map((text: string, i: number) => {
              const hash = batch.hashes[i];

              // Skip chunks we've already seen (deduplication)
              if (existingHashes.has(hash)) return null;

              const parentIndex = batch.parentIndices[i];
              const parentText = batch.parentChunks[parentIndex] ?? null;

              return {
                fileId: dbFile.id,
                fileName: file.originalname,
                text,
                vector: batch.vectors[i],
                hash,
                parentText,
                chunkIndex: i,
                entities: batch.entities[i] ?? null,
                relations: null, // reserved for future graph extraction
              };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null);

          if (chunksData.length > 0) {
            await this.prisma.chunk.createMany({ data: chunksData });
          }
        }
      } catch (err) {
        console.error('RAG processing failed:', err);
      }
    })();

    return { file: dbFile };
  }

  private async linkFile(
    link: string,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    let itemId = link;

    if (sourceId) {
      await this.sourcesService.validateGroupSource(groupId, sourceId);
    }

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
      const metadata = await this.oneDriveService.getFileMetadata(
        userId,
        itemId,
      );

      if (metadata.folder) {
        throw new BadRequestException('Cannot link folders');
      }

      const buffer = await this.oneDriveService.downloadFile(userId, itemId);

      const fileLikeMulter: Express.Multer.File = {
        buffer,
        originalname: metadata.name,
        mimetype: metadata.file?.mimeType || 'application/octet-stream',
        size: buffer.length,
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
        metadata.webUrl,
      );
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to download file from OneDrive');
    }
  }

  async storeChunks(dto: CreateChunksDto) {
    const { fileId, vectors, chunks, fileNames, relations, entities } = dto;

    const chunkRecords = vectors.map((vec, i) => ({
      fileId,
      vector: vec,
      text: chunks?.[i] || '',
      fileName: fileNames?.[i] || `chunk-${i}`,
      relations: relations?.[i] || null,
      entities: entities?.[i] || null,
    }));

    return this.prisma.chunk.createMany({ data: chunkRecords });
  }

  async getDocument(fileId: number) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new BadRequestException('File not found');
    return file;
  }

  async deleteDocument(fileId: number) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new BadRequestException('File not found');

    await this.prisma.chunk.deleteMany({ where: { fileId } });

    const key = file.path.split(`${this.bucket}/`)[1];

    if (key) {
      const { error: deleteError } = await this.supabase.storage
        .from(this.bucket)
        .remove([key]);

      if (deleteError) {
        throw new BadRequestException(
          `Failed to delete file from storage: ${deleteError.message}`,
        );
      }
    }

    await this.prisma.file.delete({ where: { id: fileId } });

    return { success: true };
  }
}