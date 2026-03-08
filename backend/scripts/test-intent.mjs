/**
 * 意图识别 MVP 验证脚本
 * 使用：先登录获取 token，再执行
 *   set TOKEN=你的jwt
 *   node scripts/test-intent.mjs
 * 或（PowerShell）：
 *   $env:TOKEN="你的jwt"; node scripts/test-intent.mjs
 */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
const TOKEN = process.env.TOKEN;

const testCases = [
  '你好',
  '在吗',
  '请问怎么修改密码？',
  '今天天气怎么样',
  '随便聊聊',
  '拜拜',
  '再见',
  '帮我看看 000001 最近涨得怎么样',
  '110011 这只基金行情如何',
  'asdfgh',
];

async function callIntent(message) {
  const res = await fetch(`${BACKEND}/api/ai/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  return res.json();
}

async function main() {
  if (!TOKEN) {
    console.log('请先设置环境变量 TOKEN（登录后从 localStorage 的 auth_token 获取）');
    console.log('示例：set TOKEN=eyJ... 然后重新运行此脚本');
    process.exit(1);
  }
  console.log('意图识别 MVP 验证\n');
  for (const msg of testCases) {
    try {
      const result = await callIntent(msg);
      const entities = result.entities?.fundCode ? ` fundCode=${result.entities.fundCode}` : '';
      console.log(`"${msg}" => ${result.intent}${entities}${result.raw ? ` (raw: ${result.raw})` : ''}`);
    } catch (e) {
      console.log(`"${msg}" => 错误: ${e.message}`);
    }
  }
}

main();
