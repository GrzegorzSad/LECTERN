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
  async processFile(file: Express.Multer.File) {
    const text = await this.extractText(file);
    const chunks = await this.splitter.splitText(text);
    const vectors = await this.embeddings.embedDocuments(chunks);
    return { chunks, vectors };
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
//CODE FOR PYTHON REDIRECTIONS

// import { Injectable } from '@nestjs/common';
// import axios from 'axios';
// import FormData from 'form-data';

// @Injectable()
// export class RagService {
//   async forwardFile(
//     file: Express.Multer.File,
//     userId: number,
//     groupId: number,
//     sourceId?: number,
//     dbFileId?: number,
//   ) {
//     const form = new FormData();
//     form.append('file', file.buffer, file.originalname);
//     form.append('user_id', userId.toString());
//     form.append('group_id', groupId.toString());
//     if (dbFileId) {
//       form.append('file_id', dbFileId.toString());
//     }
//     if (sourceId) {
//       form.append('source_id', sourceId.toString());
//     }

//     const response = await axios.post(
//       process.env.RAG_URL! + '/process-file',
//       form,
//       {
//         headers: {
//           ...form.getHeaders(),
//           'x-service-key': process.env.RAG_SERVICE_KEY!,
//         },
//         maxBodyLength: Infinity,
//       },
//     );

//     return response.data;
//   }
// }
