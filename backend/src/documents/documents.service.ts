import { Injectable } from '@nestjs/common'
import { RagService } from '../rag/rag.service'

@Injectable()
export class DocumentsService {
  constructor(private readonly ragService: RagService) {}

  async uploadDocument(file: Express.Multer.File) {
    return this.ragService.forwardFile(file)
  }
}
