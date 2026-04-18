# BFF（独立服务）

面向 **Web 前端** 的一层 **Backend for Frontend**：浏览器只与本进程通信，由本服务 **编排** 对 Nest Core（`backend`）的多次 HTTP 调用，再组合成页面友好的响应。

## 与本仓库其它部分的关系

```
浏览器 (localhost:3000)
    → 可选：Vite 代理 /bff → BFF (localhost:4000)
        → HTTP → Nest Core (localhost:3001/api)
            → PostgreSQL …
```

- **认证**：前端仍使用 Core 登录拿到的 **JWT**；请求 BFF 时在 Header 附带 `Authorization: Bearer <token>`。
- **密钥**：BFF 若需解析 Token 中的 `sub`（本示例用于并行请求 `/api/users/:id`），`.env` 中的 **`JWT_SECRET` 必须与 Core 签发 JWT 的密钥一致**（当前 Core 默认值见 `backend/src/auth/auth.module.ts`）。

## 启动

```bash
cd bff
npm install
copy .env.example .env   # Windows；或手动创建 .env
npm run dev
```

默认监听 **4000**。请先启动 **PostgreSQL** 与 **backend**（3001）。

## 接口示例

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/bff/v1/dashboard` | 需 `Authorization: Bearer`，并行拉取「当前用户」+「持仓汇总」 |

可用 curl（先在前端登录拿到 token）：

```bash
curl -s http://localhost:4000/bff/v1/dashboard -H "Authorization: Bearer <你的JWT>"
```

## 前端如何走 BFF

根目录 `frontend/vite.config.ts` 已增加将 **`/bff` 代理到 4000**。前端可请求：

`/bff/v1/dashboard`（相对站点的同源路径，由 Vite 转发到 BFF）。

Dashboard 默认通过 `frontend/src/api/bff.ts` 的 `getBffDashboard()` 拉取聚合数据；其它接口仍可直连 `/api`。

## 学习延伸

- 为 `dashboard` 增加 **超时 / 熔断 / 部分失败** 时的降级字段。
- 新增 **通用透传** 路由要谨慎：易把 Core 整面暴露给公网，通常只对可信前端开放。
- 独立部署时：BFF 与 Core 处于同一内网，浏览器 **永不直连** Core。
