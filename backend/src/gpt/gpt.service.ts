import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RagService } from 'src/rag/rag.service';

@Injectable()
export class GptService {
  private openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPEN_API_KEY,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  async ask(
    query: string,
    groupId: number,
    channelId: number | null,
    privateChatId?: number | null,
  ) {
    if (!query) throw new BadRequestException('No query provided');
    const chunks = await this.ragService.retrieveChunks(query, groupId);
    if (!chunks.length) {
      return {
        answer: "I couldn't find any relevant information to answer that.",
        chunks: [],
      };
    }
    const context = chunks.map((c) => c.text).join('\n\n---\n\n');

    const history = await this.prisma.message.findMany({
      where: privateChatId ? { privateChatId } : { channelId: channelId! },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const historyMessages = history.reverse().map((m) => ({
      role: (m.isAi ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Answer using only the provided context.' },
        { role: 'system', content: `Context:\n${context}` },
        ...historyMessages,
        { role: 'user', content: query },
      ],
    });

    return {
      answer: completion.choices[0].message?.content ?? 'No response generated',
      chunks: chunks.map((c) => ({ preview: c.text.slice(0, 200) })),
    };
  }
}
