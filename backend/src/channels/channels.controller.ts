import {
  Controller, Post, Get, Put, Delete,
  Param, Body, ParseIntPipe, UseGuards, Req
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { CreateChannelDto } from './dto/create-channel.dto';
import type { Request } from 'express';

@Controller('groups/:groupId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateChannelDto,
    @Req() req: Request,
  ) {
    return this.channelsService.createChannel(groupId, dto.name, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get()
  findAll(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: Request,
  ) {
    return this.channelsService.getChannels(groupId, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Put(':channelId')
  update(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() body: { name: string },
    @Req() req: Request,
  ) {
    return this.channelsService.updateChannel(channelId, body.name, req.session.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':channelId')
  remove(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Req() req: Request,
  ) {
    return this.channelsService.deleteChannel(channelId, req.session.user!.id);
  }
}