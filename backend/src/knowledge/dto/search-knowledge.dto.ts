import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchKnowledgeDto {
  @IsString()
  @MinLength(1)
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
