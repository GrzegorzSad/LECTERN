import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';
import { RagModule } from 'src/rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [GptController],
  providers: [GptService],
  exports: [GptService],
})
export class GptModule {}
