import { BadRequestException, Injectable } from '@nestjs/common';
import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type ModelMessage,
  type UIMessage,
  type ToolSet,
} from 'ai';
import { z } from 'zod';
import { FundService } from '../fund/fund.service';
import { HoldingsService } from '../holdings/holdings.service';
import {
  createDashscopeVlLanguageModelFromEnv,
  resolveChatLanguageModel,
} from './llm-language-model';

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

用户可能附上截图或图片：请先理解图中可见的文字、数字与图表，再结合用户的文字说明作答；若图中出现基金代码或持仓金额、收益等，可据此调用下方工具。

1. **基金查询**：当用户询问某只基金的信息、业绩、对比或风险时，调用 getFundDetails。用户可提供「6 位基金代码」或「准确的基金名称」，例如 000001 或「华夏成长混合」。

2. **记录持仓（重要）**：
   - 只要用户说了要记录/添加持仓，且提到了「基金代码 + 当前持仓金额 + 收益」，你就必须立即调用 recordHolding，用用户给的三项填好参数，直接记录。禁止追问「成本单价」「持仓份额」「购买总金额」等任何信息。
   - 用户给「当前持仓 + 收益」就足够记录，不需要再问任何问题。若用户说「不知道」「不记得」，也禁止再问，只根据已给信息能记就记。
   - 金额解析：2.6w、2.6万、26000 → currentValue=26000；收益1000、1000元、1千 → profitLoss=1000。从用户原话里提取数字并换算成元即可。

3. **查看持仓/盈亏**：用户要查看持仓、组合、总盈亏时，调用 analyzePortfolio。

请根据用户意图选择工具并执行，基于工具返回结果作答。`;

/** 将 data:...;base64,... 解码为二进制，供多模态模型使用 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const comma = dataUrl.indexOf(',');
    if (comma === -1 || !dataUrl.startsWith('data:')) return null;
    const header = dataUrl.slice(5, comma);
    const body = dataUrl.slice(comma + 1);
    if (header.includes(';base64')) {
      return new Uint8Array(Buffer.from(body, 'base64'));
    }
    return new Uint8Array(Buffer.from(decodeURIComponent(body), 'binary'));
  } catch {
    return null;
  }
}

/**
 * createOpenAI（含 DeepSeek 兼容端）在构造请求时会把 image 当 URL 校验，只接受 http(s)，
 * 前端发来的 Data URL 会报错。此处把 data: 图片转成 Uint8Array，走二进制通路。
 */
function normalizeDataUrlImagesInModelMessages(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== 'user') return msg;
    const content = msg.content;
    if (typeof content === 'string' || !Array.isArray(content)) return msg;
    const next = content.map((part: unknown) => {
      if (!part || typeof part !== 'object') return part;
      const p = part as {
        type?: string;
        image?: unknown;
        /** UI / 部分适配层可能仍用 url */
        url?: unknown;
        /** AI SDK FilePart 规范字段为 data（convertToModelMessages 对附件走这里） */
        data?: unknown;
        mediaType?: unknown;
      };
      if (p.type === 'image' && typeof p.image === 'string' && p.image.startsWith('data:')) {
        const bytes = dataUrlToUint8Array(p.image);
        if (bytes) return { type: 'image' as const, image: bytes };
      }
      // FilePart：图片附件常为 type=file + data=data:image/...;base64,...
      if (p.type === 'file') {
        const raw =
          typeof p.data === 'string'
            ? p.data
            : typeof p.url === 'string'
              ? p.url
              : null;
        const mt = typeof p.mediaType === 'string' ? p.mediaType : '';
        if (raw?.startsWith('data:') && (mt.startsWith('image/') || raw.startsWith('data:image/'))) {
          const bytes = dataUrlToUint8Array(raw);
          if (bytes) {
            return {
              type: 'image' as const,
              image: bytes,
              ...(mt ? { mediaType: mt } : {}),
            };
          }
        }
      }
      return part;
    });
    return { ...msg, content: next } as ModelMessage;
  });
}

function modelMessagesContainUserImage(messages: ModelMessage[]): boolean {
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const c = msg.content;
    if (!Array.isArray(c)) continue;
    for (const part of c) {
      if (part && typeof part === 'object' && (part as { type?: string }).type === 'image') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Chat 服务：streamText + getFundDetails / recordHolding / analyzePortfolio
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly fundService: FundService,
    private readonly holdingsService: HoldingsService,
  ) {}

  private buildTools(userId: number) {
    return {
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
    };
  }

  /**
   * 流式聊天（带 getFundDetails / recordHolding / analyzePortfolio）
   * userId 用于持仓的记录与查询。
   * uiMessages 为 useChat / DefaultChatTransport 发送的 UI 消息（可含 file 图片部件）。
   */
  async stream(
    uiMessages: Omit<UIMessage, 'id'>[],
    userId: number,
  ): Promise<{ pipeUIMessageStreamToResponse: (res: any) => void }> {
    const tools = this.buildTools(userId);
    const modelMessages = await convertToModelMessages(uiMessages, {
      tools: tools as unknown as ToolSet,
      ignoreIncompleteToolCalls: true,
    });
    const messagesForProvider = normalizeDataUrlImagesInModelMessages(modelMessages);

    let { model } = resolveChatLanguageModel();

    // 含图片：一律 DashScope 千问视觉；纯文本仍按 AI_PROVIDER / Key 优先级
    const hasUserImage = modelMessagesContainUserImage(messagesForProvider);
    if (hasUserImage) {
      try {
        model = createDashscopeVlLanguageModelFromEnv();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new BadRequestException(msg);
      }
    }

    const result = streamText({
      model,
      messages: messagesForProvider,
      system: SYSTEM_PROMPT,
      tools: tools as any,
      stopWhen: stepCountIs(5),
    });

    return result as { pipeUIMessageStreamToResponse: (res: any) => void };
  }
}
