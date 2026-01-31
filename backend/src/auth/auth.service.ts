import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: CreateUserDto, req: Request) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    req.session.user = { id: user.id, name: user.name, email: user.email };
    return { message: 'Registered', user: req.session.user };
  }

  async login(email: string, password: string, req: Request) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    req.session.user = { id: user.id, name: user.name, email: user.email };
    return { message: 'Logged in', user: req.session.user };
  }

  logout(req: Request) {
    return new Promise(resolve => {
      req.session.destroy(err => {
        if (err) resolve({ message: 'Logout failed' });
        else resolve({ message: 'Logged out' });
      });
    });
  }

  me(req: Request) {
    return req.session.user || null;
  }
}
