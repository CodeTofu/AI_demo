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
import { KnowledgeService } from '../knowledge/knowledge.service';

/** 基金查询：支持 6 位代码或基金名称 */
const fundQuerySchema = z.object({
  query: z.string().min(1, '请输入基金代码（6 位）或基金名称'),
});

const recordHoldingSchema = z.object({
  code: z.string().length(6, '基金代码必须为 6 位').regex(/^\d{6}$/, '基金代码必须为 6 位数字'),
  currentValue: z.number().positive('当前持仓金额必须大于 0'),
  profitLoss: z.number().describe('持仓收益（元），可正可负'),
});

const deleteHoldingByCodeSchema = z.object({
  code: z.string().length(6, '基金代码必须为 6 位').regex(/^\d{6}$/, '基金代码必须为 6 位数字'),
});

const SYSTEM_PROMPT = `你是一个专业的基金分析助手，也可以理解和描述用户附上的任意图片。

**识图与工具的关系（必须遵守）**
- **不要**把「上传图片」和「必须调用工具」绑在一起。图片用于帮你理解用户输入；是否调用工具只看**用户意图**。
- 用户**只发图、没有文字**时：客观描述图片内容（可见的文字、人物、场景、主题等）即可，**不要调用任何工具**，也**不要**以「与基金无关」为由拒绝描述图片本身。
- 仅当用户**明确表达**（或前后文已很清楚）需要：查基金、记/同步/更新持仓、看持仓与盈亏、删持仓等，才调用下方对应工具。不要因为图片「像」持仓表就自动写入数据库。

用户发来文字时，请结合文字与图片一并理解。

1. **基金查询**：当用户询问某只基金的信息、业绩、对比或风险时，调用 getFundDetails。用户可提供「6 位基金代码」或「准确的基金名称」，例如 000001 或「华夏成长混合」。

2. **记录或同步持仓**：
   - 调用工具 **recordHolding**：同一用户的同一 6 位基金代码若已有记录则 **自动更新**，否则 **新增**（无需用户区分「新增还是改」）。
   - **严禁**：在未实际调用 recordHolding 且工具返回 ok 为 true 之前，向用户声称「已记录」「已保存」「已成功写入」等；若无法识别代码或金额，应说明缺什么，而不是假装成功。
   - **仅当用户意图是记录/同步/更新持仓**（或上下文已明确要写入），且能从对话或截图中取得「基金代码 + 当前持仓市值 + 持仓收益」时，再调用 recordHolding；每条基金单独调用一次。禁止追问「成本单价」「持仓份额」「购买总金额」。
   - **持仓类截图 / App 截图**：在上述意图成立时，再逐行识别列表中的基金（名称后括号内常为 6 位代码）、金额（持仓市值、当前市值、金额）、持仓收益或盈亏金额（元）；有几条记几条。代码看不清时可结合基金全称调用 getFundDetails 查出 6 位代码后再 recordHolding。
   - 若图中仅有「收益率」而无具体收益金额，可将 profitLoss 填 0，并在回复中注明该条收益为占位；若有「成本」「现价」与持仓市值可推算收益则优先推算。
   - 金额解析：2.6w、2.6万、26000 → currentValue=26000；收益1000、1000元、1千 → profitLoss=1000。

3. **查看持仓/盈亏**：用户要查看持仓、组合、总盈亏、当前持仓时，**必须先调用 analyzePortfolio**，再根据其返回的 JSON 向用户转述。**禁止**在未调用 analyzePortfolio 的情况下自己编造、列举或猜测持仓明细（数据库才是唯一事实来源）。

4. **删除持仓**：
   - 用户要求「清空全部持仓」「删除所有持仓」「全部删掉」「一键清空」等，立即调用 clearAllHoldings，不要说不支持。
   - 用户要求删掉某一只基金（说了 6 位代码或能从上下文确定代码），调用 deleteHoldingByCode，参数 code。

请根据用户意图决定是否调用工具；需要工具时基于工具返回结果作答。

5. **禁止伪造工具**：不得以「[工具调用: …]」等括号文案假装已调用工具；写入持仓必须出现真实的 recordHolding 工具调用且返回 ok。`;

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

/**
 * 仅看「最后一条用户消息」是否带图。用于：本轮选用千问视觉模型（多模态）。
 * 若用户接着发纯文字，不会误判为多模态整段历史。
 */
function lastUserMessageHasImage(messages: ModelMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;
    const c = msg.content;
    if (!Array.isArray(c)) return false;
    for (const part of c) {
      if (part && typeof part === 'object' && (part as { type?: string }).type === 'image') {
        return true;
      }
    }
    return false;
  }
  return false;
}

/** 历史里是否出现过含图用户消息（用于纯文本模型请求前剥图） */
function anyUserMessageHasImage(messages: ModelMessage[]): boolean {
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const c = msg.content;
    if (!Array.isArray(c)) continue;
    for (const part of c) {
      if (!part || typeof part !== 'object') continue;
      const p = part as { type?: string; mediaType?: string };
      if (p.type === 'image') return true;
      if (p.type === 'file' && p.mediaType?.startsWith('image/')) return true;
    }
  }
  return false;
}

const USER_MULTIMODAL_STRIP_PLACEHOLDER =
  '（此处原为图片等非文本内容；多轮工具请求中已替换为纯文本，避免接口无法解析。请根据前文与工具返回继续执行 recordHolding。）';

/**
 * 将用户消息里「除 text 以外」的部件全部替换为占位文本。
 * 覆盖 image / file / 以及适配层可能带入的其它部件，避免第二步请求仍序列化为 image_url 等导致整段失败。
 */
/** 从 UI 消息中取最后一条用户文本，供 RAG 检索 */
function extractLastUserTextFromUi(uiMessages: Omit<UIMessage, 'id'>[]): string {
  for (let i = uiMessages.length - 1; i >= 0; i--) {
    const msg = uiMessages[i];
    if (msg.role !== 'user') continue;
    if (Array.isArray(msg.parts)) {
      const text = msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => ('text' in p ? String(p.text ?? '') : ''))
        .join('\n')
        .trim();
      if (text) return text;
    }
    const legacy = (msg as { content?: unknown }).content;
    if (typeof legacy === 'string' && legacy.trim()) return legacy.trim();
  }
  return '';
}

function readRagTopK(): number {
  const n = Number(process.env.RAG_TOP_K || 3);
  if (!Number.isFinite(n)) return 3;
  return Math.min(Math.max(Math.floor(n), 1), 10);
}

function readRagMinScore(): number {
  const n = Number(process.env.RAG_MIN_SCORE ?? 0.25);
  return Number.isFinite(n) ? n : 0.25;
}

function isRagEnabled(): boolean {
  return (process.env.RAG_ENABLED || 'true').trim().toLowerCase() !== 'false';
}

function stripNonTextUserParts(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== 'user') return msg;
    const content = msg.content;
    if (typeof content === 'string') return msg;
    if (!Array.isArray(content)) return msg;
    const next = content.flatMap((part: unknown) => {
      if (!part || typeof part !== 'object') return [part];
      const p = part as { type?: string };
      if (p.type === 'text') return [part];
      return [{ type: 'text' as const, text: USER_MULTIMODAL_STRIP_PLACEHOLDER }];
    });
    return { ...msg, content: next } as ModelMessage;
  });
}

/**
 * Chat 服务：streamText + 基金查询 / 记录持仓 / 查看与删除持仓
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly fundService: FundService,
    private readonly holdingsService: HoldingsService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  /** 按用户最后一条文本做向量检索，拼入 system（失败或未命中则仅用原 system） */
  private async buildSystemWithRag(uiMessages: Omit<UIMessage, 'id'>[]): Promise<string> {
    if (!isRagEnabled()) return SYSTEM_PROMPT;

    const query = extractLastUserTextFromUi(uiMessages);
    if (!query) return SYSTEM_PROMPT;

    try {
      const { hits } = await this.knowledgeService.search(query, readRagTopK());
      const minScore = readRagMinScore();
      const relevant = hits.filter((h) => h.score >= minScore);
      const ragBlock = this.knowledgeService.formatHitsForSystemPrompt(relevant);
      if (!ragBlock) return SYSTEM_PROMPT;
      return `${SYSTEM_PROMPT}\n\n---\n\n${ragBlock}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[ChatService] RAG 检索跳过:', msg);
      return SYSTEM_PROMPT;
    }
  }

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
          '记录或更新持仓（按基金代码合并：库中已有则覆盖更新，否则新增）。参数 code(6位)、currentValue(当前持仓市值元)、profitLoss(持仓收益元)。可从截图多行逐条调用。适合「008282持仓2.6w收益1000」或用户上传持仓截图识别后的每一条。',
        inputSchema: recordHoldingSchema,
        execute: async (args: { code: string; currentValue: number; profitLoss: number }) => {
          return this.holdingsService.recordOrUpdateHolding(userId, args);
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
      clearAllHoldings: {
        description:
          '清空当前用户的全部持仓记录。当用户说清空、删除全部持仓、一键清空、全部删掉等时使用。无需参数。',
        inputSchema: z.object({}),
        execute: async () => {
          return this.holdingsService.deleteAllHoldings(userId);
        },
      },
      deleteHoldingByCode: {
        description:
          '删除指定 6 位基金代码的持仓。用户明确要删掉某一只基金且已知代码时调用。参数 code。',
        inputSchema: deleteHoldingByCodeSchema,
        execute: async (args: { code: string }) => {
          return this.holdingsService.deleteHoldingByCode(userId, args.code);
        },
      },
    };
  }

  /**
   * 流式聊天（工具含持仓增删查等）
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

    /** 仅本轮用户消息含图时用千问视觉；避免后续纯文字回合仍走 VL */
    const currentTurnHasImage = lastUserMessageHasImage(messagesForProvider);
    if (currentTurnHasImage) {
      try {
        model = createDashscopeVlLanguageModelFromEnv();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new BadRequestException(msg);
      }
    }

    /** 纯文本模型无法解析 OpenAI 兼容体里的 image_url；若历史里仍有图则先剥成文本 */
    let messagesToSend = messagesForProvider;
    if (!currentTurnHasImage && anyUserMessageHasImage(messagesForProvider)) {
      messagesToSend = stripNonTextUserParts(messagesForProvider);
    }

    const system = await this.buildSystemWithRag(uiMessages);

    const result = streamText({
      model,
      messages: messagesToSend,
      system,
      tools: tools as any,
      stopWhen: stepCountIs(20),
      /**
       * 含图时从第二步起剥掉用户消息中的非 text 部件，避免多轮工具请求里仍带图导致部分上游反序列化失败。
       * 工具是否调用完全由模型按用户意图决定，此处不再强制 toolChoice / 收窄 activeTools。
       */
      prepareStep: ({ stepNumber, messages }) => {
        if (currentTurnHasImage && stepNumber >= 1) {
          return { messages: stripNonTextUserParts(messages) };
        }
        return {};
      },
    });

    return result as { pipeUIMessageStreamToResponse: (res: any) => void };
  }
}
