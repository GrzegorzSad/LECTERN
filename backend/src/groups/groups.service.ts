import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(name: string, creatorUserId: number, img?: string) {
    return this.prisma.$transaction(async (prisma) => {
      const group = await prisma.group.create({
        data: {
          name,
          img: img || null,
        },
      });

      await prisma.member.create({
        data: {
          groupId: group.id,
          userId: creatorUserId,
          role: 'ADMIN',
        },
      });

      return group;
    });
  }

  async getGroups(userId: number) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
    });
  }

  async getGroupById(id: number) {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async updateGroup(id: number, name?: string, img?: string) {
    return this.prisma.group.update({
      where: { id },
      data: {
        name: name || undefined,
        img: img || undefined,
      },
    });
  }

  async deleteGroup(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const channels = await prisma.channel.findMany({
        where: { groupId: id },
      });
      for (const channel of channels) {
        await prisma.message.deleteMany({ where: { channelId: channel.id } });
      }

      const files = await prisma.file.findMany({ where: { groupId: id } });
      for (const file of files) {
        await prisma.chunk.deleteMany({ where: { fileId: file.id } });
      }

      await prisma.channel.deleteMany({ where: { groupId: id } });
      await prisma.member.deleteMany({ where: { groupId: id } });
      await prisma.file.deleteMany({ where: { groupId: id } });
      await prisma.group.delete({ where: { id } });
    });
  }
}
