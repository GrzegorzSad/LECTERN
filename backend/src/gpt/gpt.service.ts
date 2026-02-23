import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pool } from 'pg';

@Injectable()
export class GptService {
  private openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPEN_API_KEY,
  });

  constructor(private readonly prisma: PrismaService) {}

  async ask(query: string, groupId: number, channelId: number) {
    if (!query) throw new BadRequestException('No query provided');

    const queryVector = await this.embeddings.embedQuery(query);
    const vectorLiteral = queryVector.join(',');

    const res = await this.pool.query<{ text: string }>(
      `
      SELECT c.text, c.vector <=> '[${vectorLiteral}]'::vector AS distance
      FROM "Chunk" c
      JOIN "File" f ON f.id = c."fileId"
      WHERE f."groupId" = $1
      ORDER BY distance
      LIMIT 5
      `,
      [groupId],
    );

    console.log(res);
    console.log('row count:', res.rowCount);
    console.log('first row:', res.rows[0]);

    const chunks = res.rows;

    if (!chunks.length) {
      return {
        answer: "I couldn't find any relevant information to answer that.",
        chunks: [],
      };
    }

    const context = chunks.map((c) => c.text).join('\n\n---\n\n');

    const history = await this.prisma.message.findMany({
      where: { channelId },
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
      chunks: chunks.map((c) => ({
        preview: c.text.slice(0, 200),
      })),
    };
  }
}
