import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * 意图识别请求 DTO
 */
export class IntentRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'message 不能为空' })
  @MaxLength(500, { message: 'message 最长 500 字' })
  message: string;
}

/**
 * MVP 支持的意图枚举
 */
export const INTENTS = [
  'GREETING',   // 打招呼
  'QUESTION',   // 提问/咨询
  'CHAT',       // 闲聊
  'GOODBYE',    // 告别
  'QUERY_FUND', // 查基金（行情、涨跌等）
  'UNKNOWN',    // 无法识别
] as const;

export type IntentType = (typeof INTENTS)[number];

/**
 * 意图识别响应
 */
export interface IntentResponseDto {
  intent: IntentType;
  /** 抽取的实体，如 fundCode（6 位基金代码） */
  entities?: { fundCode?: string };
  raw?: string;
}
