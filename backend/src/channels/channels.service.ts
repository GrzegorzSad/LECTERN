import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(groupId: number, name: string, userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    return this.prisma.channel.create({
      data: { name, groupId },
    });
  }

  async getChannels(groupId: number, userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    return this.prisma.channel.findMany({
      where: { groupId },
    });
  }

  async updateChannel(channelId: number, name: string, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: channel.groupId, userId } },
    });

    if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can update channels');
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: { name },
    });
  }

  async deleteChannel(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: channel.groupId, userId } },
    });
    if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can delete channels');
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.message.deleteMany({ where: { channelId } });
      await prisma.channel.delete({ where: { id: channelId } });
    });
  }
}
