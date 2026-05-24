import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { IngestKnowledgeDto } from './dto/ingest-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';

/**
 * RAG 知识库：入库与检索（需登录）
 * POST /api/knowledge/ingest
 * POST /api/knowledge/search
 */
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('ingest')
  async ingest(@Body() dto: IngestKnowledgeDto) {
    return this.knowledgeService.ingest(dto);
  }

  @Post('search')
  async search(@Body() dto: SearchKnowledgeDto) {
    return this.knowledgeService.search(dto.query, dto.topK ?? 3);
  }
}
