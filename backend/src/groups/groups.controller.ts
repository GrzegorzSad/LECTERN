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
  Req
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { CreateGroupDto } from './dto/create-group.dto';

@Controller('Groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  create(@Body() dto: CreateGroupDto, @Req() req: any) {
    const userId = req.session.user.id;
    return this.groupsService.createGroup(dto.name, userId, dto.img);
  }

  @Get()
  findAll() {
    return this.groupsService.getGroups();
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
}
