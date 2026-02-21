import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { $Enums } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(dto: CreateMemberDto) {
    const existing = await this.prisma.member.findFirst({
      where: {
        groupId: dto.groupId,
        userId: dto.userId,
      },
    });

    if (existing) {
      throw new BadRequestException('User already a member of this group');
    }

    return this.prisma.member.create({
      data: {
        groupId: dto.groupId,
        userId: dto.userId,
        role: dto.role as $Enums.MemberRole,
      },
    });
  }

  async listMembers(groupId: number) {
    return this.prisma.member.findMany({
      where: { groupId },
      include: { user: true },
    });
  }

  async updateRole(memberId: number, role: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.member.update({
      where: { id: memberId },
      data: { role: role as $Enums.MemberRole, },
    });
  }

  async removeMember(memberId: number) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.member.delete({
      where: { id: memberId },
    });
  }
}