import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createOpenAI } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import type { EmbeddingModel } from 'ai';
import {
  getDashscopeApiKey,
  getDashscopeCompatibleBaseUrl,
} from '../ai/llm-language-model';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-v3';
const DEFAULT_EMBEDDING_DIMENSIONS = 1024;

@Injectable()
export class EmbeddingService {
  private model: EmbeddingModel | null = null;

  private getExpectedDimensions(): number {
    const n = Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS);
    if (!Number.isFinite(n) || n <= 0) {
      return DEFAULT_EMBEDDING_DIMENSIONS;
    }
    return n;
  }

  private getEmbeddingModel(): EmbeddingModel {
    if (this.model) return this.model;

    const provider = (process.env.EMBEDDING_PROVIDER || 'dashscope').trim().toLowerCase();
    if (provider !== 'dashscope') {
      throw new InternalServerErrorException(
        `暂不支持的 EMBEDDING_PROVIDER=${provider}，当前仅实现 dashscope（百炼 text-embedding-v3）。`,
      );
    }

    const apiKey = getDashscopeApiKey();
    if (!apiKey) {
      throw new InternalServerErrorException(
        'RAG 向量化需要 DASHSCOPE_API_KEY（或 QWEN_API_KEY），与聊天共用百炼密钥即可。',
      );
    }

    const baseURL = getDashscopeCompatibleBaseUrl();
    const modelId =
      process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
    const client = createOpenAI({ apiKey, baseURL });
    this.model = client.embedding(modelId);
    return this.model;
  }

  private assertDimension(embedding: number[]): void {
    const expected = this.getExpectedDimensions();
    if (embedding.length !== expected) {
      throw new InternalServerErrorException(
        `embedding 维度为 ${embedding.length}，与 EMBEDDING_DIMENSIONS / 数据库 vector(${expected}) 不一致。请核对模型与表结构。`,
      );
    }
  }

  /** 单条文本 → 向量（维度须与 knowledge_chunks.embedding 一致） */
  async embedOne(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new InternalServerErrorException('embedOne: 文本不能为空');
    }
    const { embedding } = await embed({
      model: this.getEmbeddingModel(),
      value: trimmed,
    });
    this.assertDimension(embedding);
    return [...embedding];
  }

  /** 多条文本 → 向量数组（顺序与输入一致） */
  async embedManyTexts(texts: string[]): Promise<number[][]> {
    const values = texts.map((t) => t.trim()).filter(Boolean);
    if (values.length === 0) {
      return [];
    }
    const { embeddings } = await embedMany({
      model: this.getEmbeddingModel(),
      values,
    });
    return embeddings.map((e) => {
      this.assertDimension(e);
      return [...e];
    });
  }
}
