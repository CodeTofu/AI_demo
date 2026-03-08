import { Injectable } from '@nestjs/common';
import { streamText, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ChatDto } from './dto/chat.dto';
import { INTENTS, IntentType, IntentResponseDto } from './dto/intent.dto';

/**
 * AI 服务
 * 处理 AI 相关的业务逻辑
 */
@Injectable()
export class AiService {
  /**
   * 获取配置的模型
   * 支持 OpenAI 和 DeepSeek（兼容 OpenAI API 格式）
   * 从环境变量读取配置
   */
  private getModel() {
    // 从环境变量读取配置
    const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.OPENAI_API_BASE || process.env.DEEPSEEK_API_BASE;
    const modelName = process.env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'AI API Key 未配置。请在 backend 目录下的 .env 中设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。' +
          '可复制 .env.example 为 .env 后填写。',
      );
    }

    // 创建 OpenAI 客户端（兼容 DeepSeek、OpenAI 等）
    const openaiClient = createOpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1', // DeepSeek 使用 https://api.deepseek.com
    });

    // 使用 chat 接口（/v1/chat/completions），DeepSeek 等兼容 OpenAI 的厂商都支持此接口
    // 不要用默认的 openaiClient(modelName)，那会走 /v1/responses，仅 OpenAI 支持
    return openaiClient.chat(modelName);
  }

  /**
   * 流式聊天
   * @param chatDto 聊天请求数据
   * @returns 流式响应
   */
  async streamChat(chatDto: ChatDto): Promise<any> {
    // OpenAI API Key 通过环境变量 OPENAI_API_KEY 自动读取
    // 模型名称通过环境变量 OPENAI_MODEL 配置，默认为 gpt-3.5-turbo
    const result = streamText({
      model: this.getModel(),
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    });

    return result;
  }

  /**
   * 非流式聊天（一次性返回完整结果）
   * @param chatDto 聊天请求数据
   * @returns 完整响应
   */
  async chat(chatDto: ChatDto) {
    const result = await streamText({
      model: this.getModel(),
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    });

    // 等待完整响应
    const fullText = await result.text;
    return { content: fullText };
  }

  /**
   * MVP：意图识别（含 QUERY_FUND 与基金代码抽取）
   *
   * 返回含义：
   * - text：模型「原样」输出的字符串（可能带空格、换行），例如 "QUERY_FUND" 或 " query_fund "
   * - raw：对 text 做 trim + 转大写，便于和预设意图匹配
   * - intent：从 raw 里匹配出的「意图枚举」，如 'QUERY_FUND' | 'GREETING' | ... | 'UNKNOWN'
   * - entities：仅当 intent 为 QUERY_FUND 时，从「用户原文 message」里用正则抽出的 6 位基金代码，如 { fundCode: '000001' }
   *
   * 示例：message = "帮我看看 000001 最近涨得怎么样"
   *   → text 可能是 "QUERY_FUND"
   *   → raw = "QUERY_FUND"
   *   → intent = "QUERY_FUND"
   *   → entities = { fundCode: "000001" }  （来自用户输入，不是模型输出）
   */
  async recognizeIntent(message: string): Promise<IntentResponseDto> {
    const systemPrompt = `你是一个意图分类器。只根据用户输入输出一个英文意图词，不要任何解释。
可选意图仅限以下之一：
GREETING（打招呼）、QUESTION（提问/咨询）、CHAT（闲聊）、GOODBYE（告别）、QUERY_FUND（用户想查询基金行情、涨跌、净值等）、UNKNOWN（无法识别）。
当用户提到基金代码、问某只基金涨跌/行情/怎么样时，输出 QUERY_FUND。只输出一个词，例如：QUERY_FUND`;

    const { text } = await generateText({
      model: this.getModel(),
      system: systemPrompt,
      prompt: message,
      maxOutputTokens: 20,
    });

    // 模型可能返回 "QUERY_FUND" / " query_fund " / "意图是QUERY_FUND" 等，先统一成大写无首尾空
    const raw = (text || '').trim().toUpperCase();
    // 在 raw 里找第一个匹配的预设意图词，否则 UNKNOWN
    const intent = this.normalizeIntent(raw);
    // 基金代码只从用户原文 message 里用正则 \d{6} 抽，不依赖模型输出
    const entities = intent === 'QUERY_FUND' ? { fundCode: this.extractFundCode(message) } : undefined;
    return { intent, entities, raw: text ?? undefined };
  }

  /** 从用户消息中抽取 6 位基金代码（如 000001） */
  private extractFundCode(message: string): string | undefined {
    const match = message.match(/\d{6}/);
    return match ? match[0] : undefined;
  }

  /**
   * Mock 基金数据（后续可替换为真实接口）
   */
  getFundMock(code: string): { name: string; code: string; netValue: string; changePercent: string; changeAmount: string; date: string } {
    const mock: Record<string, { name: string; changePercent: string; changeAmount: string }> = {
      '000001': { name: '华夏成长混合', changePercent: '+2.35', changeAmount: '+0.0234' },
      '110011': { name: '易方达中小盘混合', changePercent: '-0.12', changeAmount: '-0.0012' },
      '161725': { name: '招商中证白酒', changePercent: '+1.88', changeAmount: '+0.0189' },
    };
    const data = mock[code] || {
      name: `基金${code}`,
      changePercent: '+0.00',
      changeAmount: '+0.0000',
    };
    return {
      name: data.name,
      code,
      netValue: '1.2345',
      changePercent: data.changePercent + '%',
      changeAmount: data.changeAmount,
      date: new Date().toISOString().slice(0, 10),
    };
  }

  private normalizeIntent(raw: string): IntentType {
    const s = raw.toUpperCase();
    for (const intent of INTENTS) {
      if (s.includes(intent)) return intent;
    }
    return 'UNKNOWN';
  }
}
