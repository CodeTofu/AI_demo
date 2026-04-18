import cors from 'cors';
import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config({ path: '.env' });

const PORT = Number(process.env.PORT) || 4000;
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const core = axios.create({
  baseURL: CORE_API_URL,
  validateStatus: () => true,
});

function getBearer(req: express.Request): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h : undefined;
}

/** 解析当前用户 id（与 Core 使用同一 JWT_SECRET 签发） */
function getUserIdFromToken(authHeader: string): number | null {
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      sub?: number | string;
    };
    const sub = decoded.sub;
    if (typeof sub === 'number' && Number.isFinite(sub)) return sub;
    if (typeof sub === 'string') {
      const n = parseInt(sub, 10);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

const app = express();
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'bff', ok: true, core: CORE_API_URL });
});

/**
 * BFF 聚合示例：并行请求 Core 的用户信息与持仓汇总，一次性返回给前端。
 * 学习点：编排、超时、对外 DTO 与内部 API 解耦。
 */
app.get('/bff/v1/dashboard', async (req, res) => {
  const auth = getBearer(req);
  if (!auth) {
    res.status(401).json({ error: '缺少 Authorization: Bearer <token>' });
    return;
  }

  const userId = getUserIdFromToken(auth);
  if (userId == null) {
    res.status(401).json({ error: 'Token 无效或已过期' });
    return;
  }

  try {
    const [summaryRes, userRes] = await Promise.all([
      core.get('/api/holdings/summary', {
        headers: { Authorization: auth },
        timeout: 15_000,
      }),
      core.get(`/api/users/${userId}`, {
        headers: { Authorization: auth },
        timeout: 10_000,
      }),
    ]);

    if (summaryRes.status === 401 || userRes.status === 401) {
      res.status(401).json({ error: 'Core API 未授权' });
      return;
    }

    if (summaryRes.status >= 400) {
      res.status(summaryRes.status).json(summaryRes.data);
      return;
    }
    if (userRes.status >= 400) {
      res.status(userRes.status).json(userRes.data);
      return;
    }

    res.json({
      generatedAt: new Date().toISOString(),
      user: userRes.data,
      portfolio: summaryRes.data,
    });
  } catch (e) {
    console.error('[BFF] dashboard aggregate error:', e);
    res.status(502).json({
      error: '无法连接 Core API',
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});

app.listen(PORT, () => {
  console.log(`BFF 运行在 http://localhost:${PORT}`);
  console.log(`聚合 Core API: ${CORE_API_URL}`);
  console.log(`示例: GET http://localhost:${PORT}/bff/v1/dashboard`);
});
