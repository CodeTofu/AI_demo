import { createOpenAI } from '@ai-sdk/openai';
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProviderSettings,
} from '@ai-sdk/google';
import { simulateStreamingMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

/** 供 Gemini 出站复用；配置了 HTTPS_PROXY 时经本地代理访问 Google */
let geminiProxyAgent: ProxyAgent | null = null;

function pickProxyUrlFromEnv(): string | undefined {
  const p =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.http_proxy?.trim();
  return p || undefined;
}

/**
 * DeepSeek「思考模式」下若走了工具调用，官方要求后续请求必须带回上一轮的 `reasoning_content`；
 * Vercel AI SDK 的 OpenAI 兼容链路通常不会带上该字段，会触发 400：
 * "The reasoning_content in the thinking mode must be passed back to the API."
 *
 * 默认在发往 DeepSeek 的 chat/completions 请求体里附加 `thinking: { type: 'disabled' }`，
 * 关闭思考链，与流式 + 多轮工具调用兼容。
 * 若确需思考链，可设 `DEEPSEEK_THINKING_MODE=enabled`（可能与工具多轮仍不兼容）。
 */
function shouldInjectDeepseekThinkingDisabled(): boolean {
  return (process.env.DEEPSEEK_THINKING_MODE || '').trim().toLowerCase() !== 'enabled';
}

function augmentDeepseekChatCompletionsBody(init?: RequestInit): RequestInit | undefined {
  if (!init?.body || typeof init.body !== 'string') return init;
  if (!shouldInjectDeepseekThinkingDisabled()) return init;
  try {
    const parsed = JSON.parse(init.body) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return init;
    if (parsed.thinking != null) return init;
    parsed.thinking = { type: 'disabled' };
    return { ...init, body: JSON.stringify(parsed) };
  } catch {
    return init;
  }
}

function createDeepseekCompatFetch(): FetchFunction {
  const base = globalThis.fetch.bind(globalThis);
  return ((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const m = init?.method?.toUpperCase();
    if (url.includes('chat/completions') && (m === undefined || m === 'POST')) {
      return base(input, augmentDeepseekChatCompletionsBody(init) ?? init);
    }
    return base(input, init);
  }) as unknown as FetchFunction;
}

function createOpenAIClientForDeepseek(apiKey: string, baseURL: string) {
  return createOpenAI({
    apiKey,
    baseURL,
    fetch: createDeepseekCompatFetch(),
  });
}

/**
 * createGoogleGenerativeAI 的公共选项：可选自定义 baseURL（反代）、可选 HTTPS 代理（大陆网络常用）。
 * Node 自带 fetch 不会读 HTTPS_PROXY，故在设置了代理环境变量时用 undici + ProxyAgent。
 */
function buildGoogleGenerativeAISettings(apiKey: string): GoogleGenerativeAIProviderSettings {
  const baseURL = process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.trim();
  const proxyUrl = pickProxyUrlFromEnv();
  const settings: GoogleGenerativeAIProviderSettings = { apiKey };
  if (baseURL) {
    settings.baseURL = baseURL;
  }
  if (proxyUrl) {
    if (!geminiProxyAgent) {
      geminiProxyAgent = new ProxyAgent(proxyUrl);
    }
    settings.fetch = ((url, init) =>
      undiciFetch(url, {
        ...init,
        dispatcher: geminiProxyAgent!,
      })) as unknown as FetchFunction;
  }
  return settings;
}

/** 当前请求实际走哪家后端（用于 DeepSeek 不支持图片等分支判断） */
export type ResolvedAiProviderKind = 'gemini' | 'openai_compatible' | 'deepseek';

/** 读取 Google AI Studio / Gemini API Key（供「带图」回退或纯 Gemini 路由使用） */
export function getGoogleGenerativeAiApiKey(): string | undefined {
  const k = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  return k?.trim() || undefined;
}

/**
 * 阿里云百炼 / DashScope（OpenAI 兼容），用于千问视觉等。
 * 控制台：https://dashscope.console.aliyun.com/
 */
export function getDashscopeApiKey(): string | undefined {
  const k = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  return k?.trim() || undefined;
}

const DEFAULT_DASHSCOPE_OPENAI_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_DASHSCOPE_VL_MODEL = 'qwen-vl-plus';
/** 纯文本默认走百炼兼容接口时的模型（与多模态 VL 分开配置） */
const DEFAULT_DASHSCOPE_CHAT_MODEL = 'qwen-turbo';

function getDashscopeCompatibleBaseUrl(): string {
  return (
    process.env.DASHSCOPE_BASE?.trim() ||
    process.env.DASHSCOPE_OPENAI_BASE?.trim() ||
    DEFAULT_DASHSCOPE_OPENAI_BASE
  ).replace(/\/$/, '');
}

/**
 * 千问多模态（OpenAI 兼容端点），用于聊天中带图；国内直连，无需访问 Google。
 *
 * 套上 simulateStreamingMiddleware：百炼在「流式 chat/completions」下有时不按 tool_choice 返回工具调用，
 * 非流式 doGenerate 行为更稳定；该中间件把内部改为单次 generate，再由 SDK 模拟文本流，便于强制工具 + 多轮工具衔接。
 */
export function createDashscopeVlLanguageModelFromEnv(): LanguageModel {
  const apiKey = getDashscopeApiKey();
  if (!apiKey) {
    throw new Error(
      '上传图片需使用千问视觉：请在 backend/.env 配置 DASHSCOPE_API_KEY 或 QWEN_API_KEY（阿里云百炼）。',
    );
  }
  const baseURL = getDashscopeCompatibleBaseUrl();
  const modelId = (
    process.env.DASHSCOPE_VL_MODEL?.trim() ||
    process.env.QWEN_VL_MODEL?.trim() ||
    DEFAULT_DASHSCOPE_VL_MODEL
  );
  const client = createOpenAI({ apiKey, baseURL });
  const base = client.chat(modelId);
  return wrapLanguageModel({
    model: base,
    middleware: simulateStreamingMiddleware(),
  });
}

function missingKeyMessage(): string {
  return (
    'AI API Key 未配置。请在 backend/.env 中配置其一：OPENAI_API_KEY、DEEPSEEK_API_KEY，或 Gemini：GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY（可选 AI_PROVIDER，见 env.example）。上传图片还需单独配置 DASHSCOPE_API_KEY。'
  );
}

/**
 * 解析聊天所用的 LanguageModel（OpenAI 兼容 / DeepSeek / Google Gemini）。
 *
 * - `AI_PROVIDER=google` | `gemini`：使用 Gemini（默认模型 gemini-1.5-flash）
 * - `AI_PROVIDER=openai`：仅用 OPENAI_API_KEY
 * - `AI_PROVIDER=deepseek`：仅用 DEEPSEEK_API_KEY
 * - 未设置 AI_PROVIDER：按优先级 OPENAI → DeepSeek → DashScope 文本 → Gemini（避免国内默认落到 Google 超时）
 */
export function resolveChatLanguageModel(): {
  model: LanguageModel;
  providerKind: ResolvedAiProviderKind;
} {
  const aiProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const gKey = getGoogleGenerativeAiApiKey();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const dashscopeKey = getDashscopeApiKey();

  const geminiModelId = (
    process.env.GEMINI_MODEL ||
    process.env.GOOGLE_GENERATIVE_AI_MODEL ||
    'gemini-1.5-flash'
  ).trim();

  if (aiProvider === 'google' || aiProvider === 'gemini') {
    if (!gKey) {
      throw new Error('AI_PROVIDER 为 google/gemini 时需配置 GOOGLE_GENERATIVE_AI_API_KEY 或 GEMINI_API_KEY。');
    }
    const google = createGoogleGenerativeAI(buildGoogleGenerativeAISettings(gKey));
    return { model: google(geminiModelId), providerKind: 'gemini' };
  }

  if (aiProvider === 'openai') {
    if (!openaiKey) throw new Error('AI_PROVIDER=openai 时需配置 OPENAI_API_KEY。');
    const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const client = createOpenAI({ apiKey: openaiKey, baseURL });
    return { model: client.chat(modelName), providerKind: 'openai_compatible' };
  }

  if (aiProvider === 'deepseek') {
    if (!deepseekKey) throw new Error('AI_PROVIDER=deepseek 时需配置 DEEPSEEK_API_KEY。');
    const baseURL = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
    const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const client = createOpenAIClientForDeepseek(deepseekKey, baseURL);
    return { model: client.chat(modelName), providerKind: 'deepseek' };
  }

  // ----- 未设置 AI_PROVIDER：优先国内/可直连，Gemini 置后 -----
  if (openaiKey) {
    const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const client = createOpenAI({ apiKey: openaiKey, baseURL });
    return { model: client.chat(modelName), providerKind: 'openai_compatible' };
  }

  if (deepseekKey) {
    const baseURL = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
    const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const client = createOpenAIClientForDeepseek(deepseekKey, baseURL);
    return { model: client.chat(modelName), providerKind: 'deepseek' };
  }

  if (dashscopeKey) {
    const baseURL = getDashscopeCompatibleBaseUrl();
    const chatModel = (
      process.env.DASHSCOPE_CHAT_MODEL?.trim() ||
      process.env.QWEN_CHAT_MODEL?.trim() ||
      DEFAULT_DASHSCOPE_CHAT_MODEL
    );
    const client = createOpenAI({ apiKey: dashscopeKey, baseURL });
    return { model: client.chat(chatModel), providerKind: 'openai_compatible' };
  }

  if (gKey) {
    const google = createGoogleGenerativeAI(buildGoogleGenerativeAISettings(gKey));
    return { model: google(geminiModelId), providerKind: 'gemini' };
  }

  throw new Error(missingKeyMessage());
}

/** 与 streamText / generateText 使用的模型实例（兼容旧调用名） */
export function getLanguageModel(): LanguageModel {
  return resolveChatLanguageModel().model;
}

/** 使用环境变量中的 Gemini 模型（默认 gemini-1.5-flash）；无 Key 时抛错 */
export function createGeminiLanguageModelFromEnv(): LanguageModel {
  const gKey = getGoogleGenerativeAiApiKey();
  if (!gKey) {
    throw new Error('未配置 GOOGLE_GENERATIVE_AI_API_KEY 或 GEMINI_API_KEY');
  }
  const geminiModelId = (
    process.env.GEMINI_MODEL ||
    process.env.GOOGLE_GENERATIVE_AI_MODEL ||
    'gemini-1.5-flash'
  ).trim();
  const google = createGoogleGenerativeAI(buildGoogleGenerativeAISettings(gKey));
  return google(geminiModelId);
}
