import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { IngestKnowledgeDto } from './dto/ingest-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * RAG 知识库：入库与检索（需登录）
 * POST /api/knowledge/ingest
 * POST /api/knowledge/upload
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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_BYTES },
      fileFilter: (_req, file, cb) => {
        const isPdf =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          return cb(new BadRequestException('仅支持 PDF 文件') as unknown as Error, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传 PDF 文件（字段名 file）');
    }
    return this.knowledgeService.ingestPdf(file, title);
  }

  @Post('search')
  async search(@Body() dto: SearchKnowledgeDto) {
    return this.knowledgeService.search(dto.query, dto.topK ?? 3);
  }
}
