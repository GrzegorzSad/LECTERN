import { Controller, Post, Get, Param, Body, ParseIntPipe, UseGuards, Req, Patch } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import type { Request } from 'express';

@Controller('private-chats/:privateChatId/messages')
export class PrivateChatMessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  send(
    @Param('privateChatId', ParseIntPipe) privateChatId: number,
    @Body() body: { content: string; parentMessageId?: number },
    @Req() req: Request,
  ) {
    return this.messagesService.sendPrivateMessage(
      privateChatId,
      req.session.user!.id,
      body.content,
      body.parentMessageId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get()
  list(
    @Param('privateChatId', ParseIntPipe) privateChatId: number,
    @Req() req: Request,
  ) {
    return this.messagesService.getPrivateMessages(
      privateChatId,
      req.session.user!.id,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':messageId/pin')
  pin(
    @Param('privateChatId', ParseIntPipe) privateChatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: Request,
  ) {
    return this.messagesService.pinPrivateMessage(messageId, req.session.user!.id);
  }
}