import { Controller, Post, Get, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { PrivateChatsService } from './private-chats.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import type { Request } from 'express';

@Controller('groups/:groupId/private-chats')
export class PrivateChatsController {
  constructor(private readonly privateChatsService: PrivateChatsService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() body: { name: string },
    @Req() req: Request,
  ) {
    return this.privateChatsService.createPrivateChat(groupId, body.name, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get()
  findAll(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: Request,
  ) {
    return this.privateChatsService.getPrivateChats(groupId, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':privateChatId')
  remove(
    @Param('privateChatId', ParseIntPipe) privateChatId: number,
    @Req() req: Request,
  ) {
    return this.privateChatsService.deletePrivateChat(privateChatId, req.session.user!.id);
  }
}