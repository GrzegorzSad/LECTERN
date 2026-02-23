import { Injectable, BadRequestException } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class RagService {
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPEN_API_KEY,
  });

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
      const data = new PDFParse(file.buffer);
      const result = await data.getText();
      return result.text;
    }

    throw new BadRequestException(`Unsupported file type: ${mime}`);
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
