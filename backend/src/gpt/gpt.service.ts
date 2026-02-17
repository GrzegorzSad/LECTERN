import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { Pool } from 'pg';

@Injectable()
export class GptService {
  private openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async ask(query: string) {
    if (!query) throw new BadRequestException('No query provided');

    const embeddingResp = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryVector = embeddingResp.data[0].embedding;
    const vectorLiteral = queryVector.join(',');

    const res = await this.pool.query(
    `
        SELECT text
        FROM "Chunk"
        ORDER BY vector <=> $1::vector
        LIMIT 5
    `,
      [`[${vectorLiteral}]`],
    );

    const chunks = res.rows;
    const context = chunks.map((c) => c.text).join('\n\n---\n\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Answer using only the provided context.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
    });

    return {
      answer: completion.choices[0].message?.content,
      chunks: chunks.map((c) => ({
        preview: c.text.slice(0, 200),
      })),
    };
  }
}
