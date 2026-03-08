import { Injectable } from '@nestjs/common';
import { streamText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { FundService } from '../fund/fund.service';
import { ChatDto } from './dto/chat.dto';

const fundCodeSchema = z.object({
  code: z.string().length(6, '基金代码必须为 6 位').regex(/^\d{6}$/, '基金代码必须为 6 位数字'),
});

/**
 * Chat 服务：使用 Vercel AI SDK streamText + 工具调用（getFundDetails）
 * 支持多步推理（maxSteps 等效为 stopWhen: stepCountIs(5)）
 */
@Injectable()
export class ChatService {
  constructor(private readonly fundService: FundService) {}

  private getModel() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.OPENAI_API_BASE || process.env.DEEPSEEK_API_BASE;
    const modelName = process.env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'AI API Key 未配置。请在 backend 目录下的 .env 中设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。',
      );
    }

    const openaiClient = createOpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1',
    });
    return openaiClient.chat(modelName);
  }

  /**
   * 流式聊天（带 getFundDetails 工具，多步推理）
   * 返回 streamText 的 result，由 Controller 调用 pipeUIMessageStreamToResponse(res) 写入响应。
   */
  async stream(chatDto: ChatDto): Promise<{ pipeUIMessageStreamToResponse: (res: any) => void }> {
    const result = streamText({
      model: this.getModel(),
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      system: `你是一个专业的基金分析助手。当用户询问某只基金（如 6 位基金代码 000001）的信息、业绩、对比或风险时，你必须调用 getFundDetails 工具获取真实数据后再回答，不要猜测或编造数据。`,
      tools: {
        getFundDetails: {
          description:
            '当用户询问基金代码（如 000001）的相关信息、业绩、对比或风险时，必须调用此工具。不要尝试猜测数据。',
          inputSchema: fundCodeSchema,
          execute: async (args: { code: string }) => {
            return this.fundService.getFundInfo(args.code);
          },
        },
      } as any,
      stopWhen: stepCountIs(5),
    });

    return result as { pipeUIMessageStreamToResponse: (res: any) => void };
  }
}
