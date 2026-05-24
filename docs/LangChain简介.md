# 🔗 LangChain 简介

## 📖 什么是 LangChain？

**LangChain** 是一个开源框架，用于构建基于大语言模型（LLM）的应用和 Agent。它由 Harrison Chase 等人发起，GitHub 上非常活跃，支持 **Python** 和 **JavaScript/TypeScript**。

**简单理解：**

- 大模型应用的「乐高积木 + 胶水」
- 不只是「问一句答一句」，而是能查资料、调工具、记状态、跑多步流程
- 官方定位已从早期的「LLM 应用框架」演进为 **Agent 工程平台**

核心理念：**把 LLM 和外部世界连接起来**。

---

## 🎯 为什么需要 LangChain？

直接调用 OpenAI / Claude API 时，很快会遇到重复工作：

| 痛点 | LangChain 的做法 |
|------|------------------|
| 换模型要改大量代码 | 统一接口，换 GPT ↔ Claude ↔ 本地模型只需改配置 |
| 文档问答要自己写检索逻辑 | 内置 RAG 流水线（切分、向量化、检索、生成） |
| 多轮对话要自己管历史 | 提供 Memory 模块 |
| 让模型调工具要自己解析 JSON | 提供 Tool / Agent 抽象 |
| 复杂流程难以维护 | Chain / Graph 把步骤结构化 |

---

## 🏗️ 架构与包结构

LangChain 生态拆成多个包，按需安装：

```
langchain-core        → 核心抽象（Runnable、LCEL 等）
langchain             → 高层 Chain、Agent、Retrieval 策略
langchain-community   → 第三方集成（向量库、Loader、Tool 等）
langchain-openai      → OpenAI 专用集成
langchain-anthropic   → Anthropic 专用集成
...（各厂商独立包）
```

### LangChain 全家桶

| 产品 | 作用 |
|------|------|
| **LangChain** | 核心框架，组装组件 |
| **LangGraph** | 有状态、可循环的多步 Agent 编排（基于图） |
| **LangSmith** | 调试、追踪、评测、监控（可对接任意框架） |
| **LangServe** | 把 Chain 暴露成 REST API |
| **LangChain Templates** | 可部署的参考架构模板 |

---

## 🧩 核心概念详解

### 1. Model I/O（模型输入输出）

封装各类 LLM 和 Embedding 模型：

- **LLM**：文本补全（如 `gpt-3.5-turbo-instruct`）
- **Chat Model**：对话模型（如 GPT-4、Claude），用 `HumanMessage` / `AIMessage` 等消息格式
- **Embeddings**：把文本转成向量，用于语义搜索

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o")
response = llm.invoke("你好")
```

### 2. Prompt Templates（提示词模板）

把固定指令和用户输入组合，避免手写字符串拼接：

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个专业的{role}"),
    ("human", "{question}")
])
chain = prompt | llm
```

### 3. LCEL（LangChain Expression Language）

用 `|` 管道符把组件串成链，**同一套代码可从原型直接上生产**（支持流式、批处理、异步）：

```python
chain = prompt | llm | output_parser
result = chain.invoke({"role": "翻译官", "question": "Hello"})
```

### 4. Chain（链）

固定步骤的流水线，典型模式：

```
输入 → 检索文档 → 拼 Prompt → 调 LLM → 解析输出
```

常见内置 Chain：摘要链、问答链、SQL 查询链等。

**Chain vs Agent：**

| | Chain | Agent |
|---|-------|-------|
| 流程 | 固定、预先定义 | 动态，模型自己决定下一步 |
| 适用 | 步骤明确的任务 | 开放、需推理的任务 |

### 5. Memory（记忆）

让应用「记住」对话或状态：

| 类型 | 说明 |
|------|------|
| **ConversationBufferMemory** | 存全部历史 |
| **ConversationSummaryMemory** | 用 LLM 压缩历史摘要 |
| **VectorStoreRetrieverMemory** | 把历史存向量库，按需检索 |

### 6. Retrieval（检索）与 RAG

**RAG（Retrieval-Augmented Generation）** 是 LangChain 最常用的场景之一：

```
用户提问
  → Embedding 向量化
  → 向量数据库检索
  → 取出相关文档片段
  → 拼入 Prompt
  → LLM 生成答案
  → 返回给用户
```

涉及组件：

- **Document Loaders**：PDF、网页、Notion、GitHub 等数据源
- **Text Splitters**：把长文档切成 chunk
- **Vector Stores**：Chroma、Pinecone、Milvus、FAISS、pgvector 等
- **Retrievers**：封装检索策略（相似度、MMR、混合检索等）

### 7. Tools（工具）

让 LLM 能调用外部能力，例如：

- 搜索引擎（Google、DuckDuckGo）
- 计算器、Python REPL
- 数据库查询
- 自定义 API

每个 Tool 有 `name`、`description`（给模型看）、`func`（实际执行逻辑）。

### 8. Agent（智能体）

Agent 循环逻辑：

```
思考 → 选择工具 → 执行 → 观察结果 → 再思考 → ... → 给出最终答案
```

常见 Agent 类型：ReAct、OpenAI Functions Agent、Structured Chat Agent 等。

### 9. Callbacks & Tracing

- 本地 Callback：日志、进度
- 接 **LangSmith**：记录每次调用的输入输出、耗时、Token 用量，便于调试和评测

---

## 🔀 LangGraph：复杂 Agent 的下一步

当 Agent 需要 **循环、分支、人工审批、持久状态** 时，单纯 Chain 不够用。LangGraph 用 **有向图** 建模工作流：

```
        ┌─────────┐
        │  START  │
        └────┬────┘
             ▼
        ┌─────────┐     需要工具    ┌─────────┐
        │  Agent  │ ──────────────► │  Tools  │
        └────┬────┘                 └────┬────┘
             │                         │
             │◄────────────────────────┘
             │  完成
             ▼
        ┌─────────┐
        │   END   │
        └─────────┘
```

特点：

- **State**：跨步骤共享状态（消息、中间结果）
- **Checkpoint**：可暂停、恢复、回滚
- **Human-in-the-loop**：某步需人工确认再继续
- **多 Agent 协作**：子 Agent、路由节点

**一句话对比：LangChain 像流水线，LangGraph 像带调度的工作流引擎。**

| 特性 | LangChain | LangGraph |
|------|-----------|-----------|
| 工作流类型 | 线性 Chain | 有状态图 |
| 记忆 | 基础 | 持久化 |
| 循环 | 需手动实现 | 原生支持 |
| 重试 | 有限 | 内置 |
| 人工审批 | 非原生 | 支持 |
| 典型场景 | RAG / 聊天机器人 | 复杂 AI Agent |

---

## 💼 典型应用场景

1. **企业知识库问答** — 上传内部文档 → RAG → 员工用自然语言查制度、手册、技术文档
2. **AI 客服** — 检索 FAQ + 调订单 API + 多轮记忆
3. **代码助手** — 读仓库、执行代码、写 PR 说明
4. **数据分析 Agent** — 自然语言 → 生成 SQL → 查库 → 图表/结论
5. **文档处理流水线** — 批量摘要、分类、信息抽取
6. **多 Agent 系统** — 研究 Agent + 写作 Agent + 审核 Agent 分工协作（常配合 LangGraph）

---

## 🚀 完整 RAG 示例

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# 1. 加载并切分文档
loader = PyPDFLoader("manual.pdf")
docs = RecursiveCharacterTextSplitter(chunk_size=500).split_documents(loader.load())

# 2. 向量化并存入向量库
vectorstore = Chroma.from_documents(docs, OpenAIEmbeddings())
retriever = vectorstore.as_retriever()

# 3. 构建 RAG 链
llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_template(
    "根据以下上下文回答问题：\n{context}\n\n问题：{input}"
)
doc_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, doc_chain)

# 4. 提问
answer = rag_chain.invoke({"input": "产品的退货政策是什么？"})
```

---

## ⚖️ 优缺点

### 优点

- 生态成熟，集成多（模型、向量库、数据源、工具）
- 抽象统一，换组件成本低
- LCEL 写法简洁，支持流式/异步/批处理
- 与 LangSmith、LangGraph 形成完整 Agent 工程链路
- 社区大，示例和模板多

### 缺点

- 版本迭代快，API 变动较频繁，老教程容易过时
- 抽象层多，简单场景可能显得「重」
- 调试复杂 Agent 时，需要配合 LangSmith 或自己打日志
- 部分 community 集成质量参差不齐

---

## 🔄 与同类框架对比

| 框架 | 特点 |
|------|------|
| **LangChain** | 组件最全，RAG/Agent 入门首选 |
| **LangGraph** | LangChain 出品，专注有状态 Agent 编排 |
| **LlamaIndex** | 更偏数据索引与 RAG，检索侧更强 |
| **Semantic Kernel** | 微软出品，.NET 生态友好 |
| **CrewAI / AutoGen** | 更专注多 Agent 协作 |
| **直接调 API + 自写** | 最轻量，适合极简单场景 |

---

## 📚 学习路径建议

1. 先掌握：**模型调用 + Prompt Template + LCEL**
2. 做一个 **RAG 小 demo**（PDF 问答）
3. 加一个 **Tool**，体验 **ReAct Agent**
4. 需要复杂流程时学 **LangGraph**
5. 上生产前接 **LangSmith** 做追踪和评测

---

## 🔗 与本项目的关系

本仓库（AI_demo）当前使用 **Vercel AI SDK** 做聊天与流式响应，RAG 部分见 [rag/RAG打通记录.md](./rag/RAG打通记录.md)。LangChain 可作为替代或补充方案，尤其在以下场景：

- 需要更丰富的 Document Loader / Retriever 生态
- 构建复杂多步 Agent（配合 LangGraph）
- 需要 LangSmith 做全链路追踪与评测

相关文档：

- [Vercel_AI_SDK简介.md](./Vercel_AI_SDK简介.md) — 本项目当前使用的 AI SDK
- [rag/RAG打通记录.md](./rag/RAG打通记录.md) — 本项目 RAG 实现记录
- [后端聊天流程.md](./后端聊天流程.md) — 聊天接口全流程

---

## 📎 参考链接

- [LangChain 官方文档](https://python.langchain.com/)
- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangSmith](https://smith.langchain.com/)
- [GitHub: langchain-ai/langchain](https://github.com/langchain-ai/langchain)
