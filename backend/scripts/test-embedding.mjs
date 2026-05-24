/**
 * Embedding 验证脚本（第二步）
 * 使用：在 backend 目录执行
 *   node scripts/test-embedding.mjs
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
const baseURL = (
  process.env.DASHSCOPE_BASE ||
  process.env.DASHSCOPE_OPENAI_BASE ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/$/, '');
const modelId = process.env.EMBEDDING_MODEL || 'text-embedding-v3';
const expectedDim = Number(process.env.EMBEDDING_DIMENSIONS || 1024);

if (!apiKey?.trim()) {
  console.error('请在 backend/.env 配置 DASHSCOPE_API_KEY');
  process.exit(1);
}

const openai = createOpenAI({ apiKey: apiKey.trim(), baseURL });
const text = '持仓收益等于当前市值减去成本';

console.log('模型:', modelId);
console.log('文本:', text);

const { embedding } = await embed({
  model: openai.embedding(modelId),
  value: text,
});

console.log('维度:', embedding.length, `(期望 ${expectedDim})`);
console.log('前 5 维:', embedding.slice(0, 5));

if (embedding.length !== expectedDim) {
  console.error('维度不匹配，请检查 EMBEDDING_MODEL 与 EMBEDDING_DIMENSIONS / 数据库 vector 列');
  process.exit(1);
}

console.log('OK');
