import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import type { Request } from 'express';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(SessionAuthGuard)
  @Patch('me/ai-settings')
  async updateAiSettings(
    @Body() body: { aiPrompt?: string; aiPersonality?: string },
    @Req() req: Request,
  ) {
    const updated = await this.usersService.updateAiSettings(
      req.session.user!.id,
      body.aiPrompt,
      body.aiPersonality,
    );
    req.session.user = updated; // keep session in sync
    return updated;
  }
}
