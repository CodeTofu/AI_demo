import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { chunkText } from './chunk-text.util';
import { embeddingToPgVectorLiteral } from './pg-vector.util';
import type { IngestKnowledgeDto } from './dto/ingest-knowledge.dto';

const EMBED_BATCH_SIZE = 10;
const DEFAULT_TOP_K = 3;

export type KnowledgeSearchHit = {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  /** 余弦相似度，越大越相关（约 0～1） */
  score: number;
  distance: number;
};

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  private demoFaqPath(): string {
    return join(process.cwd(), '..', 'docs', 'rag', 'faq.md');
  }

  private async resolveIngestText(dto: IngestKnowledgeDto): Promise<{ text: string; source: string }> {
    if (dto.text?.trim()) {
      return { text: dto.text.trim(), source: dto.source?.trim() || 'manual' };
    }
    if (dto.loadDemoFaq) {
      const path = this.demoFaqPath();
      try {
        const text = await readFile(path, 'utf8');
        return { text: text.trim(), source: dto.source?.trim() || 'docs/rag/faq.md' };
      } catch {
        throw new BadRequestException(`无法读取演示语料：${path}`);
      }
    }
    throw new BadRequestException('请提供 text，或设置 loadDemoFaq: true');
  }

  /**
   * 入库：切块 → 批量 embedding → 写入 knowledge_documents / knowledge_chunks
   */
  async ingest(dto: IngestKnowledgeDto): Promise<{
    documentId: number;
    title: string;
    source: string;
    chunkCount: number;
  }> {
    const { text, source } = await this.resolveIngestText(dto);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new BadRequestException('文本为空，无法入库');
    }

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title.trim(),
        source,
      },
    });

    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await this.embedding.embedManyTexts(batch);
      allEmbeddings.push(...embeddings);
    }

    if (allEmbeddings.length !== chunks.length) {
      throw new InternalServerErrorException('embedding 数量与切块数量不一致');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const vectorLiteral = embeddingToPgVectorLiteral(allEmbeddings[i]);
        const vectorSql = Prisma.raw(`'${vectorLiteral.replace(/'/g, "''")}'::vector`);
        await tx.$executeRaw`
          INSERT INTO knowledge_chunks ("documentId", "chunkIndex", content, embedding)
          VALUES (${doc.id}, ${i}, ${chunks[i]}, ${vectorSql})
        `;
      }
    });

    return {
      documentId: doc.id,
      title: doc.title,
      source: source,
      chunkCount: chunks.length,
    };
  }

  /**
   * 向量检索：问题 embedding + pgvector 余弦距离 Top-K
   */
  async search(query: string, topK = DEFAULT_TOP_K): Promise<{
    query: string;
    topK: number;
    hits: KnowledgeSearchHit[];
  }> {
    const q = query.trim();
    if (!q) {
      throw new BadRequestException('query 不能为空');
    }
    const k = Math.min(Math.max(topK, 1), 20);
    const queryVector = embeddingToPgVectorLiteral(await this.embedding.embedOne(q));
    const queryVectorSql = Prisma.raw(`'${queryVector.replace(/'/g, "''")}'::vector`);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: number;
        documentId: number;
        chunkIndex: number;
        content: string;
        distance: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        "documentId",
        "chunkIndex",
        content,
        (embedding <=> ${queryVectorSql}) AS distance
      FROM knowledge_chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${queryVectorSql}
      LIMIT ${k}
    `);

    const hits: KnowledgeSearchHit[] = rows.map((row) => {
      const distance = Number(row.distance);
      const score = 1 - distance;
      return {
        id: row.id,
        documentId: row.documentId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        distance,
        score,
      };
    });

    return { query: q, topK: k, hits };
  }

  /** 将检索结果格式化为可拼进 system 的文本块；无命中返回空字符串 */
  formatHitsForSystemPrompt(hits: KnowledgeSearchHit[]): string {
    if (hits.length === 0) return '';
    const lines = hits.map((h, i) => `${i + 1}. ${h.content.trim()}`);
    return [
      '【知识库参考】以下片段来自已入库文档，请优先依据其回答相关知识性问题。',
      '若与工具返回的持仓/实时数据冲突，以工具为准；若无相关内容则说明不知道，勿编造。',
      '',
      ...lines,
    ].join('\n');
  }
}
