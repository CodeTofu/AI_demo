# AI_demo

**中文 | [面向学习者的全栈示例](#简介)** — React + NestJS，集成 PostgreSQL、JWT 鉴权、基金持仓与 AI 对话能力。

## 简介

本项目是一个 **前后端分离** 的演示应用：前端使用 **React 18 + TypeScript + Vite**，后端使用 **NestJS**，数据持久化使用 **PostgreSQL**，通过 **Prisma** 管理 schema 与迁移。适合作为 Node 全栈、REST API、鉴权与 AI 接口对接的学习参考。

**主要能力概览**

- **用户体系**：注册 / 登录、JWT 保护路由、密码 bcrypt 存储  
- **业务示例**：个人基金持仓记录与概览（Dashboard）  
- **AI 对话**：基于 Vercel AI SDK 的聊天能力（需自行配置大模型 API Key）  
- **辅助页面**：`/home` 保留用户 CRUD 示例页，便于对照 REST 与前后端协作  

更细的流程说明、排错与 AI 配置见 **[docs/](./docs/)**（推荐从 [docs/README.md](./docs/README.md) 与 [docs/START_PROJECT.md](./docs/START_PROJECT.md) 开始）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18、TypeScript、Vite、React Router、Axios、Vercel AI SDK（`@ai-sdk/react`）、Recharts、SWR |
| 后端 | NestJS 10、Passport JWT、class-validator、Prisma |
| 数据库 | PostgreSQL 16（本地可用 Docker 一键启动） |
| AI | `@ai-sdk/openai` + `ai`（兼容 OpenAI 兼容接口，如 DeepSeek 等需配置 Base URL） |
| BFF（可选） | 独立 Node 服务（Express），聚合 Core API，默认端口 **4000**，详见 [bff/README.md](./bff/README.md) |

---

## 仓库结构

```
.
├── frontend/          # React 前端（端口默认 3000）
├── backend/           # NestJS Core API（端口默认 3001）
├── bff/               # 独立 BFF（可选，学习用；默认端口 4000）
├── docs/              # 补充文档（启动、聊天流程、AI SDK、排错等）
└── README.md          # 本文件
```

---

## 前置要求

- **Node.js** ≥ 18  
- **npm**（或 yarn / pnpm）  
- **PostgreSQL**：可直接安装，或使用仓库内 `backend/docker-compose.yml` 启动容器（推荐与本仓库文档中的连接串一致）  
- **Docker Desktop**（若选择用 Compose 跑数据库）  

---

## 快速开始

### 1. 启动数据库（任选其一）

**方式 A：Docker（与文档默认连接串一致）**

```bash
cd backend
docker compose up -d
```

**方式 B**：自行安装 PostgreSQL，并创建与 `.env` 中 `DATABASE_URL` 对应的数据库与用户。

### 2. 后端环境变量

在 `backend` 目录创建 `.env`（不要将真实密钥提交到 Git）。示例：

```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001

# AI 对话（按需）
OPENAI_API_KEY=""
# 或使用 DeepSeek 等兼容接口：
# DEEPSEEK_API_KEY=""
# OPENAI_API_BASE=""
# OPENAI_MODEL=""
```

数据库连接参数需与 `docker-compose.yml` 或你本地的 PostgreSQL 配置一致。

### 3. 安装依赖并初始化数据库

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

首次迁移时按 Prisma 提示输入迁移名称（例如 `init`）。

### 4. 启动后端与前端

```bash
# 终端 1
cd backend
npm run dev

# 终端 2
cd frontend
npm install
npm run dev
```

- 前端：<http://localhost:3000>  
- 后端 API 前缀：<http://localhost:3001/api>  

### 5. 使用应用

1. 打开 <http://localhost:3000/register> 注册，或 <http://localhost:3000/login> 登录。  
2. 登录后默认进入 **Dashboard**（`/`）。  
3. AI 聊天：需在后端 `.env` 中配置可用的 API Key；详见 [docs/AI_SDK_SETUP.md](./docs/AI_SDK_SETUP.md)。  

### 6. 独立 BFF（可选，学习编排层）

用于演示 **浏览器 → BFF → Nest Core** 的二跳架构：在第三个终端启动 BFF，前端可通过 Vite 代理访问 `/bff/*`。

```bash
cd bff
npm install
copy .env.example .env
npm run dev
```

- BFF：<http://localhost:4000/health>  
- 聚合示例：`GET /bff/v1/dashboard`（需登录态 JWT），说明见 [bff/README.md](./bff/README.md)。  
- Dashboard 默认通过 `getBffDashboard()` 拉取聚合数据（见 `frontend/src/api/bff.ts`）。  

**注意**：BFF 的 `JWT_SECRET` 须与 Core 签发 JWT 使用的密钥一致（见 `backend/src/auth/auth.module.ts` 当前默认值）。

---

## 常用命令

| 目录 | 命令 | 说明 |
|------|------|------|
| frontend | `npm run dev` | 开发模式 |
| frontend | `npm run build` | 生产构建 |
| backend | `npm run dev` | Nest 开发（热重载） |
| backend | `npm run prisma:studio` | Prisma 图形化查看数据 |
| backend | `npm run prisma:migrate` | 执行迁移（开发） |
| bff | `npm run dev` | 独立 BFF 开发（热重载） |

---

## 对外说明与安全提示

- 本项目以 **学习与演示** 为主，默认配置 **不适用于生产**：请务必修改 `JWT_SECRET`、数据库口令，并妥善保管 API Key。  
- **不要将** `.env`、密钥或生产数据库连接串提交到公开仓库。  
- 后端 `package.json` 中许可证字段为 `UNLICENSED`；若你希望开源发布，请自行添加合适的 **LICENSE** 文件并更新声明。  

---

## 延伸阅读

- [文档索引](./docs/README.md)  
- [详细启动步骤](./docs/START_PROJECT.md)  
- [后端说明](./backend/README.md)  
- [独立 BFF 说明](./bff/README.md)  
