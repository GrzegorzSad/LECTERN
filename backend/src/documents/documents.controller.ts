import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { UploadDocumentDto } from './dto/upload-documents.dto';
import { LinkDocumentDto } from './dto/link-documents.dto';
import { CreateChunksDto } from './dto/create-chunks.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import type { Request } from 'express';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(SessionAuthGuard)
  @Get('list')
  getDocuments(@Req() req: Request, @Query() query: ListDocumentsDto) {
    return this.documentsService.getDocuments(query);
  }

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
  link(@Body() dto: LinkDocumentDto, @Req() req: Request) {
    const userId = req.session.user!.id;
    return this.documentsService.linkDocument(
      userId,
      dto.groupId,
      dto.link,
      dto.sourceId,
    );
  }

  @Post('chunks')
  storeChunks(@Body() dto: CreateChunksDto) {
    return this.documentsService.storeChunks(dto);
  }
}

//import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { encode } from 'gpt-3-encoder'; // optional for text->embedding
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Pool } from 'pg';

export class AskDto {
  @ApiProperty({ description: 'Query to ask', example: 'Explain recursion.' })
  @IsString()
  query: string;
}

@Controller('test')
export class TestController {
  private openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

  constructor(private readonly prisma: PrismaService) {}

  @Post('ask')
  async ask(@Body() dto: AskDto) {
    const { query } = dto;
    if (!query) return { error: 'No query provided' };

    const embeddingResp = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryVector = embeddingResp.data[0].embedding;
    const vectorLiteral = queryVector.join(',');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const res = await pool.query(`
    SELECT text
    FROM "Chunk"
    ORDER BY vector <=> ARRAY[${vectorLiteral}]::vector
    LIMIT 3
  `);

    const chunks = res.rows;

    const context = chunks.map((c) => c.text).join('\n\n---\n\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Answer using only the provided context.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
    });

    return {
      answer: completion.choices[0].message?.content,
      chunks: chunks.map((c) => ({
        preview: c.text.slice(0, 200),
      })),
    };
  }
}
