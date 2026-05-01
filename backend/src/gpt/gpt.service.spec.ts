import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GptService } from './gpt.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockChunks = [
  {
    id: 1,
    fileId: 1,
    fileName: 'test.pdf',
    text: 'This is a test chunk about retrieval augmented generation.',
    contextText: 'This is a test chunk about retrieval augmented generation.',
    finalScore: 0.95,
    parentText: null,
    entities: null,
    distance: 0.1,
    bm25Score: 0.8,
  },
];

const mockRagService = {
  retrieveChunks: jest.fn().mockResolvedValue(mockChunks),
};

const mockPrisma = {
  message: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  group: {
    findUnique: jest.fn().mockResolvedValue({ aiPrompt: null, aiPersonality: null }),
  },
  channel: {
    findUnique: jest.fn().mockResolvedValue({ aiPrompt: null, aiPersonality: null }),
  },
  privateChat: {
    findUnique: jest.fn().mockResolvedValue({ aiPrompt: null, aiPersonality: null, groupId: 1, userId: 1 }),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue({ aiPrompt: null, aiPersonality: null }),
  },
};

// Mock the ChatOpenAI model with structured output
const mockModelInvoke = jest.fn().mockResolvedValue({
  answer: 'This is the AI answer.',
  citedChunkIds: [1],
});

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: jest.fn().mockReturnValue({
      invoke: mockModelInvoke,
    }),
  })),
  OpenAIEmbeddings: jest.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GptService', () => {
  let service: GptService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<GptService>(GptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── ask ───────────────────────────────────────────────────────────────────

  describe('ask', () => {
    it('should throw BadRequestException when query is empty', async () => {
      await expect(service.ask('', 1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should call retrieveChunks with the correct groupId', async () => {
      await service.ask('what is RAG?', 1, 1);
      expect(mockRagService.retrieveChunks).toHaveBeenCalledWith('what is RAG?', 1);
    });

    it('should return an answer and sources', async () => {
      const result = await service.ask('what is RAG?', 1, 1);
      expect(result.answer).toBe('This is the AI answer.');
      expect(result.sources).toHaveLength(1);
    });

    it('should map citedChunkIds back to correct source metadata', async () => {
      const result = await service.ask('what is RAG?', 1, 1);
      const source = result.sources[0];
      expect(source.chunkId).toBe(1);
      expect(source.fileId).toBe(1);
      expect(source.fileName).toBe('test.pdf');
      expect(source.preview).toBeDefined();
    });

    it('should return empty sources when no chunk IDs are cited', async () => {
      mockModelInvoke.mockResolvedValueOnce({
        answer: 'No relevant documents found.',
        citedChunkIds: [],
      });

      const result = await service.ask('unrelated question', 1, 1);
      expect(result.sources).toHaveLength(0);
    });

    it('should fetch conversation history for the correct channel', async () => {
      await service.ask('what is RAG?', 1, 42);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { channelId: 42 },
        }),
      );
    });

    it('should fetch conversation history for a private chat when privateChatId is provided', async () => {
      await service.ask('what is RAG?', 1, null, 5, 1);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { privateChatId: 5 },
        }),
      );
    });

    it('should truncate source preview to 200 characters', async () => {
      const longChunk = {
        ...mockChunks[0],
        text: 'a'.repeat(500),
      };
      mockRagService.retrieveChunks.mockResolvedValueOnce([longChunk]);

      const result = await service.ask('what is RAG?', 1, 1);
      expect(result.sources[0].preview.length).toBeLessThanOrEqual(200);
    });
  });
});