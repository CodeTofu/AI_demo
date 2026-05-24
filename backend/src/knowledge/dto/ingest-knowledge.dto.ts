import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class IngestKnowledgeDto {
  @IsString()
  @MinLength(1)
  title: string;

  /** 直接传入全文；与 loadDemoFaq 二选一 */
  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;

  @IsOptional()
  @IsString()
  source?: string;

  /** 为 true 时读取仓库 docs/rag/faq.md（从 backend 目录向上一级） */
  @IsOptional()
  @IsBoolean()
  loadDemoFaq?: boolean;
}
