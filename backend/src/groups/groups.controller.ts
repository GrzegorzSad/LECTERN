import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { CreateGroupDto } from './dto/create-group.dto';
import type { Request } from 'express';

@Controller('Groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  create(@Body() dto: CreateGroupDto, @Req() req: Request) {
    const userId = req.session.user!.id;
    return this.groupsService.createGroup(dto.name, userId, dto.img);
  }

  @UseGuards(SessionAuthGuard)
  @Get()
  findAll(@Req() req: Request) {
    return this.groupsService.getGroups(req.session.user!.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupById(id);
  }

  @UseGuards(SessionAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; img?: string },
  ) {
    return this.groupsService.updateGroup(id, body.name, body.img);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.deleteGroup(id);
  }

  @UseGuards(SessionAuthGuard)
  @Post(':id/invite')
  generateInvite(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.generateInviteToken(id);
  }

  @UseGuards(SessionAuthGuard)
  @Put(':id/ai-settings')
  updateAiSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { aiPrompt?: string; aiPersonality?: string },
  ) {
    return this.groupsService.updateGroupAiSettings(
      id,
      body.aiPrompt,
      body.aiPersonality,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Post('join/:token')
  joinByToken(@Param('token') token: string, @Req() req: Request) {
    return this.groupsService.joinByToken(token, req.session.user!.id);
  }
}
