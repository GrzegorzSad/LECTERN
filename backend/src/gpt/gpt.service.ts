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
    userId?: number | null,
  ) {
    if (!query) throw new BadRequestException('No query provided');

    const [chunks, history, group, channel, privateChat, user] = await Promise.all([
      this.ragService.retrieveChunks(query, groupId),
      this.prisma.message.findMany({
        where: privateChatId ? { privateChatId } : { channelId: channelId! },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // group/channel settings only for channel messages
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
      // private chat + user settings only for private messages
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

    const historyMessages = history.reverse().map((m) => ({
      role: (m.isAi ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));

    // Prompts — additive per context type
    const prompts = privateChatId
      ? [user?.aiPrompt, privateChat?.aiPrompt].filter(Boolean).join('\n\n')
      : [group?.aiPrompt, channel?.aiPrompt].filter(Boolean).join('\n\n');

    // Personality — most specific wins per context type
    const personality = privateChatId
      ? privateChat?.aiPersonality ?? user?.aiPersonality
      : channel?.aiPersonality ?? group?.aiPersonality;

    const context = chunks.length
      ? chunks.map((c) => c.text).join('\n\n---\n\n')
      : null;

    const contextMessages = context
      ? [
          { role: 'system' as const, content: 'Answer using the provided context if applicable.' },
          { role: 'system' as const, content: `Context:\n${context}` },
        ]
      : [
          { role: 'system' as const, content: 'No relevant documents were found. Let the user know you have no context to answer from.' },
        ];

        console.log('here: ',prompts)

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...(personality ? [{ role: 'system' as const, content: personality }] : []),
        ...(prompts ? [{ role: 'system' as const, content: prompts }] : []),
        ...contextMessages,
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