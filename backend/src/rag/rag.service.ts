import { Injectable, BadRequestException } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';

const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;
import { Pool } from 'pg';
import * as crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrieveOptions {
  mimeTypes?: string[];
  uploadedAfter?: Date;
  fileNameContains?: string;
  fileIds?: number[];
  topK?: number;
}

interface RawChunk {
  id: number;
  fileId: number;
  text: string;
  fileName: string;
  parentText: string | null;
  entities: string | null;
  distance: number;
  bm25Score: number;
}

interface RankedChunk extends RawChunk {
  contextText: string;
  finalScore: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RagService {
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  });

  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Small chunks for precise retrieval
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 40,
  });

  // Larger chunks stored as parent context windows
  private parentSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 100,
  });

  private BATCH_SIZE = 50;

  // ─── Ingest ───────────────────────────────────────────────────────────────

  async processFile(file: Express.Multer.File) {
    const text = await this.extractText(file);
    const chunks = await this.splitter.splitText(text);
    const parentChunks = await this.parentSplitter.splitText(text);
    const vectors = await this.embedInBatches(chunks);
    const entities = await this.extractEntitiesInBatches(chunks);
    const hashes = chunks.map((c) => this.hashChunk(c));
    return { chunks, parentChunks, vectors, entities, hashes };
  }

  async *processFileStream(file: Express.Multer.File) {
    const text = await this.extractText(file);
    const chunks = await this.splitter.splitText(text);
    const parentChunks = await this.parentSplitter.splitText(text);

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const [vectors, entities] = await Promise.all([
        this.embeddings.embedDocuments(batch),
        this.extractEntitiesInBatches(batch),
      ]);

      yield {
        chunks: batch,
        parentChunks,
        vectors,
        entities,
        hashes: batch.map((c) => this.hashChunk(c)),
        parentIndices: batch.map((_, j) =>
          this.findParentIndex(i + j, chunks, parentChunks),
        ),
      };
    }
  }

  // ─── Retrieval ────────────────────────────────────────────────────────────

  async retrieveChunks(
    query: string,
    groupId: number,
    options: RetrieveOptions = {},
  ): Promise<RankedChunk[]> {
    const {
      topK = 5,
      mimeTypes,
      uploadedAfter,
      fileNameContains,
      fileIds,
    } = options;

    // 1. Embed the query
    const queryVector = await this.embeddings.embedQuery(query);
    const vectorLiteral = `[${queryVector.join(',')}]`;

    // 2. Build parameterised filter conditions.
    const params: unknown[] = [query, groupId];
    const extraConditions: string[] = [];
    let paramIndex = 3;

    if (mimeTypes?.length) {
      extraConditions.push(`f."mimeType" = ANY($${paramIndex}::text[])`);
      params.push(mimeTypes);
      paramIndex++;
    }
    if (uploadedAfter) {
      extraConditions.push(`f."createdAt" >= $${paramIndex}`);
      params.push(uploadedAfter);
      paramIndex++;
    }
    if (fileNameContains) {
      extraConditions.push(`f.name ILIKE $${paramIndex}`);
      params.push(`%${fileNameContains}%`);
      paramIndex++;
    }
    if (fileIds?.length) {
      extraConditions.push(`f.id = ANY($${paramIndex}::int[])`);
      params.push(fileIds);
      paramIndex++;
    }

    const baseCondition = `f."groupId" = $2`;
    const metaConditions = [baseCondition, ...extraConditions].join(' AND ');
    const ftsConditions = `${metaConditions} AND to_tsvector('english', c.text) @@ plainto_tsquery('english', $1)`;

    const candidateCount = Math.max(topK * 4, 20);

    const rows = await this.pool.query<RawChunk>(
      `
      WITH vector_search AS (
        SELECT
          c.id,
          c."fileId",
          c.text,
          c."fileName",
          c.entities,
          c."parentText",
          c.vector <=> '${vectorLiteral}'::vector AS distance,
          0::float AS bm25_score,
          ROW_NUMBER() OVER (
            ORDER BY c.vector <=> '${vectorLiteral}'::vector
          ) AS vector_rank
        FROM "Chunk" c
        JOIN "File" f ON f.id = c."fileId"
        WHERE ${metaConditions}
        ORDER BY distance
        LIMIT ${candidateCount}
      ),
      fts_search AS (
        SELECT
          c.id,
          c."fileId",
          c.text,
          c."fileName",
          c.entities,
          c."parentText",
          0::float AS distance,
          ts_rank_cd(
            to_tsvector('english', c.text),
            plainto_tsquery('english', $1)
          ) AS bm25_score,
          ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(
              to_tsvector('english', c.text),
              plainto_tsquery('english', $1)
            ) DESC
          ) AS fts_rank
        FROM "Chunk" c
        JOIN "File" f ON f.id = c."fileId"
        WHERE ${ftsConditions}
        ORDER BY bm25_score DESC
        LIMIT ${candidateCount}
      ),
      rrf AS (
        SELECT
          COALESCE(v.id, ft.id) AS id,
          COALESCE(v."fileId", ft."fileId") AS "fileId",
          COALESCE(v.text, ft.text) AS text,
          COALESCE(v."fileName", ft."fileName") AS "fileName",
          COALESCE(v.entities, ft.entities) AS entities,
          COALESCE(v."parentText", ft."parentText") AS "parentText",
          COALESCE(v.distance, 1) AS distance,
          COALESCE(ft.bm25_score, 0) AS "bm25Score",
          (
            COALESCE(1.0 / (60 + v.vector_rank), 0) +
            COALESCE(1.0 / (60 + ft.fts_rank), 0)
          ) AS rrf_score
        FROM vector_search v
        FULL OUTER JOIN fts_search ft ON v.id = ft.id
      )
      SELECT id, "fileId", text, "fileName", entities, "parentText",
             distance, "bm25Score"
      FROM rrf
      ORDER BY rrf_score DESC
      LIMIT ${candidateCount}
      `,
      params,
    );

    if (rows.rows.length === 0) return [];

    return this.rankFallback(rows.rows, topK);
  }

  private rankFallback(chunks: RawChunk[], topK: number): RankedChunk[] {
    return chunks.slice(0, topK).map((chunk) => ({
      ...chunk,
      contextText: chunk.parentText ?? chunk.text,
      finalScore: 1 - chunk.distance,
    }));
  }

  private async extractEntitiesInBatches(chunks: string[]): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((chunk) => this.extractEntities(chunk)),
      );
      results.push(...batchResults);
    }
    return results;
  }

  private async extractEntities(text: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Extract key named entities (people, organisations, places, dates, technical terms) from the text. Return ONLY a comma-separated list of entities, nothing else. Max 10 entities.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 100,
        temperature: 0,
      });
      return completion.choices[0]?.message?.content?.trim() ?? '';
    } catch {
      return '';
    }
  }

  private async embedInBatches(chunks: string[]) {
    const results: number[][] = [];
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const batchVectors = await this.embeddings.embedDocuments(batch);
      results.push(...batchVectors);
    }
    return results;
  }

  private hashChunk(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private findParentIndex(
    chunkIndex: number,
    chunks: string[],
    parentChunks: string[],
  ): number {
    const charOffset = chunks
      .slice(0, chunkIndex)
      .reduce((a, c) => a + c.length, 0);
    let cumulative = 0;
    for (let i = 0; i < parentChunks.length; i++) {
      cumulative += parentChunks[i].length;
      if (cumulative >= charOffset) return i;
    }
    return parentChunks.length - 1;
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    const mime = file.mimetype;

    if (mime === 'text/plain' || mime === 'text/markdown') {
      return file.buffer.toString('utf-8');
    }

    if (mime === 'application/pdf') {
      const data = await pdfParse(file.buffer);
      return data.text;
    }

    throw new BadRequestException(`Unsupported file type: ${mime}`);
  }
}
