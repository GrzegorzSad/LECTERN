import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RagService } from './rag.service';

// ─── Mock external dependencies ───────────────────────────────────────────────

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    embedDocuments: jest.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
  })),
}));

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'entity1, entity2' } }],
        }),
      },
    },
  })),
);

jest.mock('cohere-ai', () => ({
  CohereClient: jest.fn().mockImplementation(() => ({
    rerank: jest.fn().mockResolvedValue({ results: [] }),
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({ text: 'extracted pdf text' }),
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagService],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── hashChunk ─────────────────────────────────────────────────────────────

  describe('hashChunk', () => {
    it('should return a consistent SHA-256 hash for the same input', () => {
      const hash1 = (service as any).hashChunk('hello world');
      const hash2 = (service as any).hashChunk('hello world');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = (service as any).hashChunk('hello world');
      const hash2 = (service as any).hashChunk('goodbye world');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64 character hex string (SHA-256)', () => {
      const hash = (service as any).hashChunk('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ─── findParentIndex ───────────────────────────────────────────────────────

  describe('findParentIndex', () => {
    it('should return 0 for the first chunk', () => {
      const chunks = ['short chunk one', 'short chunk two'];
      const parentChunks = ['short chunk one short chunk two longer parent'];
      const result = (service as any).findParentIndex(0, chunks, parentChunks);
      expect(result).toBe(0);
    });

    it('should return the last parent index when offset exceeds all parents', () => {
      const chunks = ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(100)];
      const parentChunks = ['a'.repeat(50), 'b'.repeat(50)];
      const result = (service as any).findParentIndex(2, chunks, parentChunks);
      expect(result).toBe(parentChunks.length - 1);
    });

    it('should map a later chunk to a later parent', () => {
      const chunks = ['a'.repeat(500), 'b'.repeat(500)];
      const parentChunks = ['a'.repeat(400), 'b'.repeat(400), 'c'.repeat(400)];
      const firstResult = (service as any).findParentIndex(0, chunks, parentChunks);
      const secondResult = (service as any).findParentIndex(1, chunks, parentChunks);
      expect(secondResult).toBeGreaterThanOrEqual(firstResult);
    });
  });

  // ─── extractText ───────────────────────────────────────────────────────────

  describe('extractText', () => {
    it('should extract text from a plain text file', async () => {
      const mockFile = {
        mimetype: 'text/plain',
        buffer: Buffer.from('hello world'),
      } as Express.Multer.File;

      const result = await (service as any).extractText(mockFile);
      expect(result).toBe('hello world');
    });

    it('should extract text from a markdown file', async () => {
      const mockFile = {
        mimetype: 'text/markdown',
        buffer: Buffer.from('# Heading\nSome content'),
      } as Express.Multer.File;

      const result = await (service as any).extractText(mockFile);
      expect(result).toBe('# Heading\nSome content');
    });

    it('should extract text from a PDF file', async () => {
      const mockFile = {
        mimetype: 'application/pdf',
        buffer: Buffer.from('fake pdf bytes'),
      } as Express.Multer.File;

      const result = await (service as any).extractText(mockFile);
      expect(result).toBe('extracted pdf text');
    });

    it('should throw BadRequestException for unsupported file types', async () => {
      const mockFile = {
        mimetype: 'application/zip',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      await expect((service as any).extractText(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for image files', async () => {
      const mockFile = {
        mimetype: 'image/png',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      await expect((service as any).extractText(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── retrieveChunks ────────────────────────────────────────────────────────

  describe('retrieveChunks', () => {
    it('should return an empty array when no chunks are found', async () => {
      const result = await service.retrieveChunks('test query', 1);
      expect(result).toEqual([]);
    });
  });
});