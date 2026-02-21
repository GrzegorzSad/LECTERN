import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SourcesService } from './sources.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  getSources() {
    return this.sourcesService.getSources();
  }

  @UseGuards(SessionAuthGuard)
  @Post()
  createSource(@Body() body: { name: string }) {
    return this.sourcesService.createSource(body.name);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
  deleteSource(@Param('id', ParseIntPipe) id: number) {
    return this.sourcesService.deleteSource(id);
  }

  @Get('group/:groupId')
  getGroupSources(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.sourcesService.getGroupSources(groupId);
  }

  @UseGuards(SessionAuthGuard)
  @Post('group/:groupId/:sourceId')
  addSourceToGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.sourcesService.addSourceToGroup(groupId, sourceId);
  }

  @UseGuards(SessionAuthGuard)
  @Delete('group/:groupId/:sourceId')
  removeSourceFromGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.sourcesService.removeSourceFromGroup(groupId, sourceId);
  }
}