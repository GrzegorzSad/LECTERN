import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import type { Request } from 'express';
import { LoginDto } from './dto/auth-login.dto';
import { UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body.email, body.password, req);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.authService.me(req.session.user!.id);
  }
}
