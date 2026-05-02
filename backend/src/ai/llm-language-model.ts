import { createOpenAI } from '@ai-sdk/openai';
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProviderSettings,
} from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
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

/**
 * 千问多模态（OpenAI 兼容端点），用于聊天中带图；国内直连，无需访问 Google。
 */
export function createDashscopeVlLanguageModelFromEnv(): LanguageModel {
  const apiKey = getDashscopeApiKey();
  if (!apiKey) {
    throw new Error(
      '上传图片需使用千问视觉：请在 backend/.env 配置 DASHSCOPE_API_KEY 或 QWEN_API_KEY（阿里云百炼）。',
    );
  }
  const baseURL = (
    process.env.DASHSCOPE_BASE?.trim() ||
    process.env.DASHSCOPE_OPENAI_BASE?.trim() ||
    DEFAULT_DASHSCOPE_OPENAI_BASE
  ).replace(/\/$/, '');
  const modelId = (
    process.env.DASHSCOPE_VL_MODEL?.trim() ||
    process.env.QWEN_VL_MODEL?.trim() ||
    DEFAULT_DASHSCOPE_VL_MODEL
  );
  const client = createOpenAI({ apiKey, baseURL });
  return client.chat(modelId);
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
 * - 未设置 AI_PROVIDER：按优先级 OPENAI_API_KEY → Gemini Key → DEEPSEEK_API_KEY
 */
export function resolveChatLanguageModel(): {
  model: LanguageModel;
  providerKind: ResolvedAiProviderKind;
} {
  const aiProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const gKey = getGoogleGenerativeAiApiKey();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();

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
    const client = createOpenAI({ apiKey: deepseekKey, baseURL });
    return { model: client.chat(modelName), providerKind: 'deepseek' };
  }

  // ----- 未设置 AI_PROVIDER：按 Key 优先级自动选择 -----
  if (openaiKey) {
    const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const client = createOpenAI({ apiKey: openaiKey, baseURL });
    return { model: client.chat(modelName), providerKind: 'openai_compatible' };
  }

  if (gKey) {
    const google = createGoogleGenerativeAI(buildGoogleGenerativeAISettings(gKey));
    return { model: google(geminiModelId), providerKind: 'gemini' };
  }

  if (deepseekKey) {
    const baseURL = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
    const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const client = createOpenAI({ apiKey: deepseekKey, baseURL });
    return { model: client.chat(modelName), providerKind: 'deepseek' };
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
