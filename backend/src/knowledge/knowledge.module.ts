import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { PdfChunkService } from './pdf-chunk.service';

/**
 * 知识库 / RAG：向量化、入库、检索
 */
@Module({
  controllers: [KnowledgeController],
  providers: [EmbeddingService, KnowledgeService, PdfChunkService],
  exports: [EmbeddingService, KnowledgeService],
})
export class KnowledgeModule {}
