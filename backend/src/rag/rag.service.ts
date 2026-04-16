import { Injectable, BadRequestException } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PDFParse } from 'pdf-parse';
import { Pool } from 'pg';

@Injectable()
export class RagService {
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPEN_API_KEY,
  });

  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  private BATCH_SIZE = 50;

  async processFile(file: Express.Multer.File) {
    const text = await this.extractText(file);
    const chunks = await this.splitter.splitText(text);
    const vectors = await this.embedInBatches(chunks);
    return { chunks, vectors };
  }

  async *processFileStream(file: Express.Multer.File) {
    const text = await this.extractText(file);
    const chunks = await this.splitter.splitText(text);

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(batch);

      yield {
        chunks: batch,
        vectors,
      };
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

  private async extractText(file: Express.Multer.File): Promise<string> {
    const mime = file.mimetype;

    if (mime === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    if (mime === 'application/pdf') {
      const uint8 = new Uint8Array(file.buffer);
      const data = new PDFParse(uint8);
      const result = await data.getText();
      return result.text;
    }

    throw new BadRequestException(`Unsupported file type: ${mime}`);
  }

  async retrieveChunks(query: string, groupId: number) {
    const queryVector = await this.embeddings.embedQuery(query);
    const vectorLiteral = queryVector.join(',');

    const res = await this.pool.query<{
      id: number;
      fileId: number;
      text: string;
      fileName: string;
    }>(
      `
      SELECT c.id, c."fileId", c.text, c."fileName",
             c.vector <=> '[${vectorLiteral}]'::vector AS distance
      FROM "Chunk" c
      JOIN "File" f ON f.id = c."fileId"
      WHERE f."groupId" = $1
      ORDER BY distance
      LIMIT 5
      `,
      [groupId],
    );

    return res.rows;
  }
}