import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { GptService } from '../gpt/gpt.service';
import { ChatGateway } from '../chat/chat.gateway';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  channel: {
    findUnique: jest.fn(),
  },
  member: {
    findUnique: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  privateChat: {
    findUnique: jest.fn(),
  },
};

const mockGptService = {
  ask: jest.fn().mockResolvedValue({
    answer: 'AI response',
    sources: [],
  }),
};

const mockChatGateway = {
  emitNewMessage: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GptService, useValue: mockGptService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('should throw NotFoundException when channel does not exist', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(1, 1, 'hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({ id: 1, groupId: 1 });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(1, 1, 'hello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a user message and emit it when noAi is true', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({ id: 1, groupId: 1 });
      mockPrisma.member.findUnique.mockResolvedValue({ id: 1, role: 'MEMBER' });
      mockPrisma.message.create.mockResolvedValue({ id: 10 });
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 10,
        content: 'hello',
        user: { id: 1, name: 'Test User' },
      });

      const result = await service.sendMessage(1, 1, 'hello', undefined, true);

      expect(result.aiMessage).toBeNull();
      expect(result.sources).toEqual([]);
      expect(mockChatGateway.emitNewMessage).toHaveBeenCalledTimes(1);
    });

    it('should call GptService and emit both messages when noAi is false', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({ id: 1, groupId: 1 });
      mockPrisma.member.findUnique.mockResolvedValue({ id: 1, role: 'MEMBER' });
      mockPrisma.message.create
        .mockResolvedValueOnce({ id: 10 })
        .mockResolvedValueOnce({ id: 11 });
      mockPrisma.message.findUnique
        .mockResolvedValueOnce({ id: 10, content: 'hello', user: { id: 1, name: 'User' } })
        .mockResolvedValueOnce({ id: 11, content: 'AI response', user: { id: 1, name: 'User' } });

      const result = await service.sendMessage(1, 1, 'hello');

      expect(mockGptService.ask).toHaveBeenCalledTimes(1);
      expect(mockChatGateway.emitNewMessage).toHaveBeenCalledTimes(2);
      expect(result.aiMessage).toBeDefined();
    });
  });

  // ─── getMessages ───────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('should throw NotFoundException when channel does not exist', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      await expect(service.getMessages(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({ id: 1, groupId: 1 });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(service.getMessages(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return messages when user is a valid member', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({ id: 1, groupId: 1 });
      mockPrisma.member.findUnique.mockResolvedValue({ id: 1, role: 'MEMBER' });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 1, content: 'hello', user: { id: 1, name: 'User' }, replies: [] },
      ]);

      const result = await service.getMessages(1, 1);
      expect(result).toHaveLength(1);
    });
  });

  // ─── deleteMessage ─────────────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('should throw NotFoundException when message does not exist', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.deleteMessage(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author or admin', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        userId: 99,
        channel: { groupId: 1 },
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'MEMBER' });

      await expect(service.deleteMessage(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should allow the message author to delete their own message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        channel: { groupId: 1 },
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'MEMBER' });
      mockPrisma.message.delete.mockResolvedValue({ id: 1 });

      const result = await service.deleteMessage(1, 1);
      expect(result).toEqual({ id: 1 });
    });

    it('should allow an admin to delete another user message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        userId: 99,
        channel: { groupId: 1 },
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.message.delete.mockResolvedValue({ id: 1 });

      const result = await service.deleteMessage(1, 1);
      expect(result).toEqual({ id: 1 });
    });
  });

  // ─── pinMessage ────────────────────────────────────────────────────────────

  describe('pinMessage', () => {
    it('should throw NotFoundException when message does not exist', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.pinMessage(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not an admin or owner', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        isPinned: false,
        channel: { groupId: 1 },
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'MEMBER' });

      await expect(service.pinMessage(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should toggle pin status when user is an admin', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        isPinned: false,
        channel: { groupId: 1 },
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.message.update.mockResolvedValue({ id: 1, isPinned: true });

      const result = await service.pinMessage(1, 1);
      expect(result.isPinned).toBe(true);
    });
  });

  // ─── sendPrivateMessage ────────────────────────────────────────────────────

  describe('sendPrivateMessage', () => {
    it('should throw NotFoundException when private chat does not exist', async () => {
      mockPrisma.privateChat.findUnique.mockResolvedValue(null);

      await expect(service.sendPrivateMessage(1, 1, 'hello')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the private chat', async () => {
      mockPrisma.privateChat.findUnique.mockResolvedValue({ id: 1, userId: 99, groupId: 1 });

      await expect(service.sendPrivateMessage(1, 1, 'hello')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});