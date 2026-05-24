# 知识库 PDF 上传（LangChain 分片）

本文说明「知识库管理页 + PDF 上传 → LangChain 分片 → 向量化入库」的实现方式与使用步骤。

## 整体流程

```
前端 /knowledge 页
  → POST /api/knowledge/upload（multipart，字段 file）
  → LangChain PDFLoader 提取文本
  → LangChain RecursiveCharacterTextSplitter 分片
  → 现有 EmbeddingService（百炼 text-embedding-v3）向量化
  → 写入 knowledge_documents / knowledge_chunks（pgvector）
  → /api/chat 聊天时自动 RAG 检索
```

## 已实现内容

### 后端

| 文件 | 说明 |
|------|------|
| `backend/src/knowledge/pdf-chunk.service.ts` | LangChain PDF 解析 + 分片 |
| `backend/src/knowledge/knowledge.service.ts` | `ingestPdf()`、`ingestChunks()` 复用入库逻辑 |
| `backend/src/knowledge/knowledge.controller.ts` | `POST /api/knowledge/upload` |

**依赖（backend）：**

- `@langchain/community` — `PDFLoader`
- `@langchain/textsplitters` — `RecursiveCharacterTextSplitter`
- `@langchain/core` — Document 类型
- `pdf-parse` — **须为 1.1.1**（LangChain `PDFLoader` 从该版本内部路径加载 pdf.js；2.x 不兼容）

**接口：**

```http
POST /api/knowledge/upload
Authorization: Bearer <JWT>
Content-Type: multipart/form-data

file: <PDF 文件>   # 必填，最大 10MB
title: <文档标题>  # 可选，默认取文件名
```

**响应示例：**

```json
{
  "documentId": 2,
  "title": "产品手册",
  "source": "upload:产品手册.pdf",
  "chunkCount": 15
}
```

分片参数与原有 RAG 一致，可通过环境变量配置：

- `RAG_CHUNK_SIZE`（默认 500）
- `RAG_CHUNK_OVERLAP`（默认 80）

向量化仍使用现有 `EmbeddingService`（非 LangChain Embeddings），与 pgvector `vector(1024)` 维度保持一致。

### 前端

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/Knowledge.tsx` | 知识库管理页（PDF 上传） |
| `frontend/src/api/knowledge.ts` | `uploadKnowledgePdf()` |
| `frontend/src/App.tsx` | 路由 `/knowledge` |

访问：登录后打开 `http://localhost:3000/knowledge`。

## 使用步骤

1. 启动 PostgreSQL（pgvector）与后端、前端（见 [项目启动指南.md](../项目启动指南.md)）
2. 确保 `.env` 中配置了 `DASHSCOPE_API_KEY`（或 `QWEN_API_KEY`）和 `DATABASE_URL`
3. 登录前端，进入 **知识库** 页
4. 选择 PDF，点击「上传并向量化」
5. 到 **AI 聊天** 提问文档相关内容，验证 RAG 是否命中

## 架构说明

### 为什么 LangChain 只用于分片，embedding 仍用现有服务？

项目已有稳定的 **Vercel AI SDK + 百炼 embedding + pgvector** 链路。引入 LangChain 的主要价值是：

- `PDFLoader`：成熟的 PDF 文本提取
- `RecursiveCharacterTextSplitter`：按语义边界切块

向量化、存储、检索、聊天注入均复用现有代码，避免重复造轮子，也无需改动数据库维度。

### 与原有 ingest 的关系

| 接口 | 输入 | 分片方式 |
|------|------|----------|
| `POST /api/knowledge/ingest` | JSON 文本 / demo FAQ | 自研 `chunkText` |
| `POST /api/knowledge/upload` | PDF 文件 | LangChain |

两者最终都走 `ingestChunks()` → embedding → pgvector。

## 后续可扩展

- 文档列表 / 删除 API
- 按 `source` 去重或覆盖同文件
- 支持 Word、Markdown 等格式
- pgvector HNSW 索引优化检索性能
- 上传进度与异步任务（大文件）

## 相关文档

- [RAG打通记录.md](./RAG打通记录.md) — 原有 RAG 链路
- [LangChain简介.md](../LangChain简介.md) — LangChain 概念
- [后端聊天流程.md](../后端聊天流程.md) — 聊天中 RAG 注入
