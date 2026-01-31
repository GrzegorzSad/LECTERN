import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  @Post('login')
  login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService.login(body.email, body.password, req);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.authService.me(req);
  }
}
