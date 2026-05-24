/**
 * RAG ingest + search 验证（需 JWT）
 *
 * PowerShell:
 *   $env:TOKEN="登录后的 jwt"
 *   node scripts/test-knowledge-rag.mjs
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
const TOKEN = process.env.TOKEN;

if (!TOKEN?.trim()) {
  console.error('请设置环境变量 TOKEN（登录后 localStorage 的 auth_token）');
  process.exit(1);
}

async function post(path, body) {
  const res = await fetch(`${BACKEND}/api/knowledge/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN.trim()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

console.log('1) ingest demo faq...');
const ingested = await post('ingest', {
  title: '基金持仓 FAQ',
  loadDemoFaq: true,
});
console.log(ingested);

console.log('\n2) search...');
const searched = await post('search', {
  query: '持仓收益怎么计算',
  topK: 3,
});
console.log(JSON.stringify(searched, null, 2));
