import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrivateChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrivateChat(groupId: number, name: string, userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    return this.prisma.privateChat.create({
      data: { name, groupId, userId },
    });
  }

  async renamePrivateChat(privateChatId: number, name: string, userId: number) {
    const chat = await this.prisma.privateChat.findUnique({
      where: { id: privateChatId },
    });
    if (!chat) throw new NotFoundException('Private chat not found');
    if (chat.userId !== userId)
      throw new ForbiddenException('Not your private chat');
    return this.prisma.privateChat.update({
      where: { id: privateChatId },
      data: { name },
    });
  }

  async getPrivateChats(groupId: number, userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    return this.prisma.privateChat.findMany({
      where: { groupId, userId },
    });
  }

  async deletePrivateChat(privateChatId: number, userId: number) {
    const chat = await this.prisma.privateChat.findUnique({
      where: { id: privateChatId },
    });
    if (!chat) throw new NotFoundException('Private chat not found');
    if (chat.userId !== userId)
      throw new ForbiddenException('Not your private chat');

    return this.prisma.$transaction(async (prisma) => {
      await prisma.message.deleteMany({ where: { privateChatId } });
      await prisma.privateChat.delete({ where: { id: privateChatId } });
    });
  }
}
