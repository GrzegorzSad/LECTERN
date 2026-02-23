import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GptService } from './gpt.service';
import { AskDto } from './dto/ask.dto';

@ApiTags('gpt')
@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.gptService.ask(dto.query, dto.groupId, dto.channelId);
  }
}