# 🤖 Vercel AI SDK 简介

## 📖 什么是 Vercel AI SDK？

**Vercel AI SDK** 是由 Vercel 公司推出的一个 **JavaScript/TypeScript SDK**，专门用于在 Web 应用中集成 AI 功能。

**简单理解：**
- 类似 `axios`，但专门用于调用 AI 模型（如 ChatGPT、Claude 等）
- 提供统一的 API，可以轻松切换不同的 AI 提供商
- 支持流式响应（Streaming），实现打字机效果
- 特别适合 Next.js 和 React 应用

---

## 🎯 核心功能

### 1. **统一多个 AI 提供商的接口**

**支持的 AI 提供商：**
- OpenAI (ChatGPT)
- Anthropic (Claude)
- Google (Gemini)
- Cohere
- Hugging Face
- 自定义模型

**好处：**
- 一套代码，可以切换不同的 AI 模型
- 不需要为每个提供商写不同的代码

### 2. **流式响应（Streaming）**

**什么是流式响应？**
- 传统方式：等待 AI 生成完整回答后一次性返回
- 流式响应：AI 一边生成，一边实时返回（类似打字机效果）

**示例：**
```typescript
// 传统方式（等待完整回答）
const response = await ai.complete("写一首诗");
console.log(response); // 等待 5 秒后，一次性显示完整内容

// 流式响应（实时显示）
const stream = ai.stream("写一首诗");
for await (const chunk of stream) {
  console.log(chunk); // 每 0.5 秒显示一部分，像打字机一样
}
```

### 3. **React/Next.js 集成**

**特别优化了 React 和 Next.js：**
- 支持 React Server Components
- 支持 Server Actions
- 内置 React Hooks（如 `useChat`、`useCompletion`）

---

## 📦 安装

```bash
npm install ai
```

**注意：** 包名是 `ai`，不是 `vercel-ai-sdk`

---

## 🚀 快速开始示例

### 示例 1：基础使用（Node.js/Next.js API Route）

```typescript
// app/api/chat/route.ts (Next.js)
import { openai } from 'ai/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### 示例 2：React 组件中使用（流式响应）

```typescript
// app/chat/page.tsx
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
        />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

### 示例 3：在 NestJS 中使用（后端）

```typescript
// src/ai/ai.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { streamText } from 'ai';
import { openai } from 'ai/openai';

@Controller('ai')
export class AiController {
  @Post('chat')
  async chat(@Body() body: { messages: any[] }) {
    const result = streamText({
      model: openai('gpt-4'),
      messages: body.messages,
    });

    // 返回流式响应
    return new Response(result.toDataStreamResponse());
  }
}
```

---

## 🔑 核心概念

### 1. **流式文本生成（Streaming Text）**

```typescript
import { streamText } from 'ai';
import { openai } from 'ai/openai';

const result = streamText({
  model: openai('gpt-4'),
  prompt: '写一个关于 AI 的短故事',
});

// 流式读取
for await (const chunk of result.textStream) {
  console.log(chunk); // 实时显示生成的内容
}
```

### 2. **React Hooks**

#### `useChat` - 聊天功能

```typescript
import { useChat } from 'ai/react';

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat', // API 端点
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

#### `useCompletion` - 文本补全

```typescript
import { useCompletion } from 'ai/react';

function CompletionComponent() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <div>{completion}</div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">生成</button>
      </form>
    </div>
  );
}
```

### 3. **工具调用（Tool Calling）**

**让 AI 可以调用函数：**

```typescript
import { streamText, tool } from 'ai';
import { openai } from 'ai/openai';

const result = streamText({
  model: openai('gpt-4'),
  prompt: '北京现在的天气怎么样？',
  tools: {
    getWeather: tool({
      description: '获取指定城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' },
        },
      },
      execute: async ({ city }) => {
        // 调用真实的天气 API
        return `北京今天晴天，25°C`;
      },
    }),
  },
});
```

---

## 🆚 与其他方案对比

### 方案 1：直接调用 OpenAI API

```typescript
// 需要手动处理流式响应、错误处理等
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

// 需要手动解析流式数据...
const reader = response.body.getReader();
// ... 复杂的处理逻辑
```

### 方案 2：使用 Vercel AI SDK

```typescript
// 简单、统一、类型安全
import { streamText } from 'ai';
import { openai } from 'ai/openai';

const result = streamText({
  model: openai('gpt-4'),
  messages: [{ role: 'user', content: 'Hello' }],
});

// 自动处理流式响应
for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

**优势：**
- ✅ 代码更简洁
- ✅ 类型安全（TypeScript）
- ✅ 统一接口（可以切换 AI 提供商）
- ✅ 内置 React 支持
- ✅ 自动处理错误和重试

---

## 🎨 实际应用场景

### 1. **聊天机器人**

```typescript
// 类似 ChatGPT 的对话界面
const { messages, input, handleSubmit } = useChat();
```

### 2. **代码生成助手**

```typescript
// 根据描述生成代码
const { completion } = useCompletion({
  api: '/api/generate-code',
});
```

### 3. **内容创作工具**

```typescript
// 写文章、写邮件、写总结等
const result = streamText({
  model: openai('gpt-4'),
  prompt: '写一篇关于 TypeScript 的文章',
});
```

### 4. **智能问答系统**

```typescript
// 结合工具调用，回答复杂问题
const result = streamText({
  model: openai('gpt-4'),
  tools: {
    searchDatabase: tool({ ... }),
    getWeather: tool({ ... }),
  },
});
```

---

## 🔧 在你的项目中集成

### 在 NestJS 后端集成

```bash
cd backend
npm install ai
```

```typescript
// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
```

```typescript
// src/ai/ai.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { streamText } from 'ai';
import { openai } from 'ai/openai';

@Controller('ai')
export class AiController {
  @Post('chat')
  async chat(@Body() body: { messages: any[] }) {
    const result = streamText({
      model: openai('gpt-4'),
      messages: body.messages,
    });

    return new Response(result.toDataStreamResponse(), {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }
}
```

### 在 React 前端集成

```bash
cd frontend
npm install ai
```

```typescript
// src/components/Chat.tsx
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: 'http://localhost:3001/api/ai/chat',
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

---

## 📚 学习资源

### 官方文档
- [Vercel AI SDK 官方文档](https://sdk.vercel.ai/docs)
- [GitHub 仓库](https://github.com/vercel/ai)

### 示例项目
- [Next.js AI Chatbot](https://github.com/vercel/ai-chatbot)
- [AI SDK Examples](https://github.com/vercel/ai/tree/main/examples)

---

## 🎯 总结

### Vercel AI SDK 是什么？

**一句话总结：** 一个用于在 Web 应用中集成 AI 功能的 JavaScript/TypeScript SDK。

### 核心优势

1. **统一接口** - 一套代码支持多个 AI 提供商
2. **流式响应** - 实现打字机效果，提升用户体验
3. **React 集成** - 内置 Hooks，开箱即用
4. **类型安全** - 完整的 TypeScript 支持
5. **易于使用** - API 简洁，学习成本低

### 适用场景

- ✅ 聊天机器人
- ✅ 代码生成工具
- ✅ 内容创作助手
- ✅ 智能问答系统
- ✅ 任何需要 AI 功能的 Web 应用

### 与你的项目结合

如果你想要在当前的 NestJS + React 项目中添加 AI 功能（比如智能客服、内容生成等），Vercel AI SDK 是一个很好的选择！

---

## 💡 下一步

1. **安装 SDK**：`npm install ai`
2. **阅读文档**：查看官方文档了解详细 API
3. **尝试示例**：从简单的聊天功能开始
4. **集成到项目**：在你的 NestJS 后端和 React 前端中使用
