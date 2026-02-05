import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LinkedAccountsService } from './linked-accounts.service';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';
import type { Request, Response } from 'express';

@Controller('linked-accounts')
@UseGuards(SessionAuthGuard)
export class LinkedAccountsController {
  constructor(private readonly service: LinkedAccountsService) {}

  @Get()
  list(@Req() req: Request) {
    return this.service.list(req.session.user!.id);
  }

  @Get('microsoft/connect')
  redirectToMicrosoft(@Res() res: Response) {
    const redirectUrl = this.service.getMicrosoftAuthUrl();
    return res.redirect(redirectUrl);
  }

  @Get('microsoft/callback')
  microsoftCallback(@Req() req: Request) {
    const code = req.query.code as string;
    if (!code) {
      throw new Error('Missing authorization code');
    }
    return this.service.linkMicrosoftAccount(req.session.user!.id, code);
  }

  @Delete(':id')
  unlink(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.unlink(id, req.session.user!.id);
  }
}
