import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { CreateMessageDto } from './dto/create-message.dto';
import type { Request } from 'express';

@Controller('channels/:channelId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  send(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: CreateMessageDto,
    @Req() req: Request,
  ) {
    return this.messagesService.sendMessage(
      channelId,
      req.session.user!.id,
      dto.content,
      dto.parentMessageId,
      dto.noAi
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get()
  findAll(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Req() req: Request,
  ) {
    return this.messagesService.getMessages(channelId, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':messageId')
  remove(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: Request,
  ) {
    return this.messagesService.deleteMessage(messageId, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':messageId/pin')
  pin(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: Request,
  ) {
    return this.messagesService.pinMessage(messageId, req.session.user!.id);
  }
}
