import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from 'src/middleware/middleware.authguard';

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(SessionAuthGuard)
  @Post()
  addMember(@Body() dto: CreateMemberDto) {
    return this.membersService.addMember(dto);
  }

  @Get(':groupId')
  listMembers(@Param('groupId') groupId: string) {
    return this.membersService.listMembers(Number(groupId));
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':memberId')
  updateRole(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(Number(memberId), dto.role);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':memberId')
  removeMember(@Param('memberId') memberId: string) {
    return this.membersService.removeMember(Number(memberId));
  }
}
