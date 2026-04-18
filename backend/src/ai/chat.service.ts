import { Injectable } from '@nestjs/common';
import { streamText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { FundService } from '../fund/fund.service';
import { HoldingsService } from '../holdings/holdings.service';
import { ChatDto } from './dto/chat.dto';

/** 基金查询：支持 6 位代码或基金名称 */
const fundQuerySchema = z.object({
  query: z.string().min(1, '请输入基金代码（6 位）或基金名称'),
});

const recordHoldingSchema = z.object({
  code: z.string().length(6, '基金代码必须为 6 位').regex(/^\d{6}$/, '基金代码必须为 6 位数字'),
  currentValue: z.number().positive('当前持仓金额必须大于 0'),
  profitLoss: z.number().describe('持仓收益（元），可正可负'),
});

const SYSTEM_PROMPT = `你是一个专业的基金分析助手。

1. **基金查询**：当用户询问某只基金的信息、业绩、对比或风险时，调用 getFundDetails。用户可提供「6 位基金代码」或「准确的基金名称」，例如 000001 或「华夏成长混合」。

2. **记录持仓（重要）**：
   - 只要用户说了要记录/添加持仓，且提到了「基金代码 + 当前持仓金额 + 收益」，你就必须立即调用 recordHolding，用用户给的三项填好参数，直接记录。禁止追问「成本单价」「持仓份额」「购买总金额」等任何信息。
   - 用户给「当前持仓 + 收益」就足够记录，不需要再问任何问题。若用户说「不知道」「不记得」，也禁止再问，只根据已给信息能记就记。
   - 金额解析：2.6w、2.6万、26000 → currentValue=26000；收益1000、1000元、1千 → profitLoss=1000。从用户原话里提取数字并换算成元即可。

3. **查看持仓/盈亏**：用户要查看持仓、组合、总盈亏时，调用 analyzePortfolio。

请根据用户意图选择工具并执行，基于工具返回结果作答。`;

/**
 * Chat 服务：streamText + getFundDetails / recordHolding / analyzePortfolio
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly fundService: FundService,
    private readonly holdingsService: HoldingsService,
  ) {}

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
   * 流式聊天（带 getFundDetails / recordHolding / analyzePortfolio）
   * userId 用于持仓的记录与查询。
   */
  async stream(
    chatDto: ChatDto,
    userId: number,
  ): Promise<{ pipeUIMessageStreamToResponse: (res: any) => void }> {
    const result = streamText({
      model: this.getModel(),
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      system: SYSTEM_PROMPT,
      tools: {
        getFundDetails: {
          description:
            '当用户询问某只基金的信息、业绩、对比或风险时调用。入参为 query：用户提供的 6 位基金代码（如 000001）或准确的基金名称（如 华夏成长混合）。不要尝试猜测数据。',
          inputSchema: fundQuerySchema,
          execute: async (args: { query: string }) => {
            return this.fundService.getFundInfoByQuery(args.query);
          },
        },
        recordHolding: {
          description:
            '记录持仓。仅需三参数：code(6位基金代码)、currentValue(当前持仓市值，元)、profitLoss(持仓收益，元)。用户只要说了代码+持仓金额+收益就必须立即调用，禁止追问成本、份额、总金额。例如「008282持仓2.6w收益1000」即 code=008282, currentValue=26000, profitLoss=1000。',
          inputSchema: recordHoldingSchema,
          execute: async (args: { code: string; currentValue: number; profitLoss: number }) => {
            return this.holdingsService.recordHolding(userId, args);
          },
        },
        analyzePortfolio: {
          description:
            '当用户要查看持仓、组合分析、总盈亏时调用。无需参数，返回该用户所有持仓及基于实时净值的盈亏汇总。',
          inputSchema: z.object({}),
          execute: async () => {
            return this.holdingsService.analyzePortfolio(userId);
          },
        },
      } as any,
      stopWhen: stepCountIs(5),
    });

    return result as { pipeUIMessageStreamToResponse: (res: any) => void };
  }
}
