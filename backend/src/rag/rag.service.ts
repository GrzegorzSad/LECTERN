import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class RagService {
  async forwardFile(
    file: Express.Multer.File,
    userId: number,
    groupId: number,
    sourceId?: number,
  ) {
    const form = new FormData();
    form.append('file', file.buffer, file.originalname);
    form.append('user_id', userId.toString());
    form.append('group_id', groupId.toString());

    if (sourceId) {
      form.append('source_id', sourceId.toString());
    }

    const response = await axios.post(
      process.env.RAG_URL! + '/process-file',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-service-key': process.env.RAG_SERVICE_KEY!,
        },
        maxBodyLength: Infinity,
      },
    );

    return response.data;
  }
}
