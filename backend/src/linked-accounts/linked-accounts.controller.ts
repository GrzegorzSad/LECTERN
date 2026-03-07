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
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect('http://localhost:5173/');
    }
    try {
      await this.service.linkMicrosoftAccount(req.session.user!.id, code);
      return res.redirect('http://localhost:5173/');
    } catch (err) {
      return res.redirect('http://localhost:5173/error');
    }
  }

  @Delete(':id')
  unlink(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.unlink(id, req.session.user!.id);
  }
}
