import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GptService } from '../gpt/gpt.service';
import { ChatGateway } from 'src/chat/chat.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gptService: GptService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private findMessageWithUser(id: number) {
    return this.prisma.message.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async sendMessage(
    channelId: number,
    userId: number,
    content: string,
    parentMessageId?: number,
    noAi = false,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: channel.groupId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    const userMsg = await this.prisma.message.create({
      data: {
        content,
        channelId,
        userId,
        isAi: false,
        parentMessageId: parentMessageId ?? null,
      },
    });

    if (noAi) {
      const userMessage = await this.findMessageWithUser(userMsg.id);
      this.chatGateway.emitNewMessage(channelId, userMessage);
      return { userMessage, aiMessage: null, sources: [] };
    }

    const aiResponse = await this.gptService.ask(
      content,
      channel.groupId,
      channelId,
    );

    const aiMsg = await this.prisma.message.create({
      data: {
        content: aiResponse.answer,
        channelId,
        userId,
        isAi: true,
        parentMessageId: null,
      },
    });

    const [userMessage, aiMessage] = await Promise.all([
      this.findMessageWithUser(userMsg.id),
      this.findMessageWithUser(aiMsg.id),
    ]);

    this.chatGateway.emitNewMessage(channelId, userMessage);
    this.chatGateway.emitNewMessage(channelId, aiMessage);

    return { userMessage, aiMessage, sources: aiResponse.sources };
  }

  async getMessages(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: channel.groupId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this group');

    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (!message.channel)
      throw new ForbiddenException('Not allowed to delete this message');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: message.channel.groupId, userId } },
    });
    const isOwnerOrAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';
    const isAuthor = message.userId === userId;
    if (!isAuthor && !isOwnerOrAdmin) {
      throw new ForbiddenException('Not allowed to delete this message');
    }
    return this.prisma.message.delete({ where: { id: messageId } });
  }

  async pinMessage(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (!message.channel)
      throw new ForbiddenException('Only admins can pin messages');

    const member = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: message.channel.groupId, userId } },
    });
    if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can pin messages');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });
  }

  async sendPrivateMessage(
    privateChatId: number,
    userId: number,
    content: string,
    parentMessageId?: number,
  ) {
    const privateChat = await this.prisma.privateChat.findUnique({
      where: { id: privateChatId },
    });
    if (!privateChat) throw new NotFoundException('Private chat not found');
    if (privateChat.userId !== userId)
      throw new ForbiddenException('Not your private chat');

    const userMsg = await this.prisma.message.create({
      data: {
        content,
        privateChatId,
        userId,
        isAi: false,
        parentMessageId: parentMessageId ?? null,
      },
    });

    const aiResponse = await this.gptService.ask(
      content,
      privateChat.groupId,
      null,
      privateChatId,
      userId,
    );

    const aiMsg = await this.prisma.message.create({
      data: {
        content: aiResponse.answer,
        privateChatId,
        userId,
        isAi: true,
        parentMessageId: null,
      },
    });

    const [userMessage, aiMessage] = await Promise.all([
      this.findMessageWithUser(userMsg.id),
      this.findMessageWithUser(aiMsg.id),
    ]);

    return { userMessage, aiMessage, sources: aiResponse.sources };
  }

  async getPrivateMessages(privateChatId: number, userId: number) {
    const privateChat = await this.prisma.privateChat.findUnique({
      where: { id: privateChatId },
    });
    if (!privateChat) throw new NotFoundException('Private chat not found');
    if (privateChat.userId !== userId)
      throw new ForbiddenException('Not your private chat');

    return this.prisma.message.findMany({
      where: { privateChatId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async pinPrivateMessage(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { privateChat: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (!message.privateChat)
      throw new ForbiddenException('Not a private chat message');

    if (message.privateChat.userId !== userId) {
      throw new ForbiddenException(
        'Only the private chat owner can pin messages',
      );
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: { user: { select: { id: true, name: true } } },
    });
  }
  
}