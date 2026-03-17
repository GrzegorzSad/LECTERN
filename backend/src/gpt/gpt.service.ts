import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { RagService } from 'src/rag/rag.service';
import { z } from 'zod';

const AnswerSchema = z.object({
  answer: z.string().describe('The answer to the user query'),
  citedChunkIds: z
    .array(z.number())
    .describe(
      'IDs of the chunks that were actually used to inform this answer. Empty array if none were relevant.',
    ),
});

@Injectable()
export class GptService {
  private model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    apiKey: process.env.OPEN_API_KEY,
  }).withStructuredOutput(AnswerSchema);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  async ask(
    query: string,
    groupId: number,
    channelId: number | null,
    privateChatId?: number | null,
    userId?: number | null,
  ) {
    if (!query) throw new BadRequestException('No query provided');

    const [chunks, history, group, channel, privateChat, user] =
      await Promise.all([
        this.ragService.retrieveChunks(query, groupId),
        this.prisma.message.findMany({
          where: privateChatId ? { privateChatId } : { channelId: channelId! },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        !privateChatId
          ? this.prisma.group.findUnique({
              where: { id: groupId },
              select: { aiPrompt: true, aiPersonality: true },
            })
          : null,
        channelId
          ? this.prisma.channel.findUnique({
              where: { id: channelId },
              select: { aiPrompt: true, aiPersonality: true },
            })
          : null,
        privateChatId
          ? this.prisma.privateChat.findUnique({
              where: { id: privateChatId },
              select: { aiPrompt: true, aiPersonality: true },
            })
          : null,
        privateChatId && userId
          ? this.prisma.user.findUnique({
              where: { id: userId },
              select: { aiPrompt: true, aiPersonality: true },
            })
          : null,
      ]);

    const historyMessages = history
      .reverse()
      .map((m) =>
        m.isAi ? new AIMessage(m.content) : new HumanMessage(m.content),
      );

    const prompts = privateChatId
      ? [user?.aiPrompt, privateChat?.aiPrompt].filter(Boolean).join('\n\n')
      : [group?.aiPrompt, channel?.aiPrompt].filter(Boolean).join('\n\n');

    const personality = privateChatId
      ? (privateChat?.aiPersonality ?? user?.aiPersonality)
      : (channel?.aiPersonality ?? group?.aiPersonality);

    const contextBlock = chunks.length
      ? chunks
          .map((c) => `[chunk_id:${c.id}] (${c.fileName})\n${c.text}`)
          .join('\n\n---\n\n')
      : null;

    const result = await this.model.invoke([
      ...(personality ? [new SystemMessage(personality)] : []),
      ...(prompts ? [new SystemMessage(prompts)] : []),
      contextBlock
        ? new SystemMessage(
            `Answer using the context below. In citedChunkIds, include only the chunk IDs you actually drew from.\n\nContext:\n${contextBlock}`,
          )
        : new SystemMessage(
            'No relevant documents found. Say so in your answer and return an empty citedChunkIds array.',
          ),
      ...historyMessages,
      new HumanMessage(query),
    ]);

    const sources = result.citedChunkIds
      .map((id) => chunks.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({
        chunkId: c!.id,
        fileName: c!.fileName,
        preview: c!.text.slice(0, 200),
      }));

    return {
      answer: result.answer,
      sources,
    };
  }
}
