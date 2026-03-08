# 🤖 大模型 API 配置指南

## 📋 当前配置

项目当前使用 **OpenAI** 作为大模型提供商，模型为 `gpt-3.5-turbo`。

---

## 🚀 快速配置 OpenAI API

### 步骤 1：获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 进入 **API Keys** 页面：https://platform.openai.com/api-keys
4. 点击 **"Create new secret key"**
5. 复制生成的 API Key（格式类似：`sk-...`）

**⚠️ 重要：** API Key 只显示一次，请妥善保存！

### 步骤 2：配置环境变量

在 `backend/.env` 文件中添加：

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**示例：**
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 步骤 3：重启后端服务

```bash
cd backend
# 停止当前服务（Ctrl + C）
npm run dev
```

---

## 🔧 修改模型配置

### 修改为 GPT-4

编辑 `backend/src/ai/ai.service.ts`：

```typescript
async streamChat(chatDto: ChatDto) {
  const result = streamText({
    model: openai('gpt-4'), // 👈 改为 gpt-4
    messages: chatDto.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  });

  return result;
}
```

### 可用的 OpenAI 模型

- `gpt-4` - 最新最强的模型
- `gpt-4-turbo` - GPT-4 的优化版本
- `gpt-3.5-turbo` - 当前使用的模型（性价比高）
- `gpt-4o` - GPT-4 优化版
- `gpt-4o-mini` - 轻量级版本

### 使用环境变量配置模型

**更好的方式：** 使用环境变量配置模型，这样不需要修改代码。

1. **在 `backend/.env` 中添加：**
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4  # 可选，默认为 gpt-3.5-turbo
```

2. **修改 `backend/src/ai/ai.service.ts`：**
```typescript
import { Injectable } from '@nestjs/common';
import { streamText } from 'ai';
import { openai } from 'ai/openai';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly model: string;

  constructor() {
    // 从环境变量读取模型名称，默认为 gpt-3.5-turbo
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async streamChat(chatDto: ChatDto) {
    const result = streamText({
      model: openai(this.model), // 👈 使用配置的模型
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    });

    return result;
  }

  async chat(chatDto: ChatDto) {
    const result = await streamText({
      model: openai(this.model), // 👈 使用配置的模型
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    });

    const fullText = await result.text;
    return { content: fullText };
  }
}
```

---

## 🔄 切换到其他大模型提供商

### 方案 1：使用 Anthropic Claude

#### 1. 安装依赖

```bash
cd backend
npm install @anthropic-ai/sdk
```

#### 2. 获取 API Key

访问 [Anthropic Console](https://console.anthropic.com/) 获取 API Key。

#### 3. 配置环境变量

```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

#### 4. 修改代码

```typescript
import { anthropic } from 'ai/anthropic';

async streamChat(chatDto: ChatDto) {
  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'), // 👈 使用 Claude
    messages: chatDto.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  });

  return result;
}
```

### 方案 2：使用 Google Gemini

#### 1. 安装依赖

```bash
cd backend
npm install @google/generative-ai
```

#### 2. 获取 API Key

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取 API Key。

#### 3. 配置环境变量

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

#### 4. 修改代码

```typescript
import { google } from 'ai/google';

async streamChat(chatDto: ChatDto) {
  const result = streamText({
    model: google('gemini-pro'), // 👈 使用 Gemini
    messages: chatDto.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  });

  return result;
}
```

### 方案 3：使用本地模型（Ollama）

#### 1. 安装 Ollama

访问 [Ollama](https://ollama.ai/) 下载并安装。

#### 2. 下载模型

```bash
ollama pull llama2
# 或
ollama pull mistral
```

#### 3. 修改代码

```typescript
import { createOllama } from 'ollama';

async streamChat(chatDto: ChatDto) {
  const ollama = createOllama({
    baseURL: 'http://localhost:11434', // Ollama 默认地址
  });

  const result = streamText({
    model: ollama('llama2'), // 👈 使用本地模型
    messages: chatDto.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  });

  return result;
}
```

---

## 🎯 支持多个模型（动态切换）

### 实现方式

修改 `backend/src/ai/ai.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { streamText } from 'ai';
import { openai } from 'ai/openai';
import { anthropic } from 'ai/anthropic';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private getModel(provider: string = 'openai') {
    const modelName = process.env[`${provider.toUpperCase()}_MODEL`] || 
      (provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-5-sonnet-20241022');

    switch (provider) {
      case 'openai':
        return openai(modelName);
      case 'anthropic':
        return anthropic(modelName);
      default:
        return openai('gpt-3.5-turbo');
    }
  }

  async streamChat(chatDto: ChatDto, provider: string = 'openai') {
    const result = streamText({
      model: this.getModel(provider),
      messages: chatDto.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    });

    return result;
  }
}
```

### 在 DTO 中添加 provider 字段

修改 `backend/src/ai/dto/chat.dto.ts`：

```typescript
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsString()
  @IsOptional()
  provider?: string; // 👈 添加 provider 字段
}
```

---

## 📊 模型对比

| 提供商 | 模型 | 优势 | 价格 |
|--------|------|------|------|
| OpenAI | GPT-4 | 功能强大，理解能力强 | 较高 |
| OpenAI | GPT-3.5-turbo | 性价比高，速度快 | 中等 |
| Anthropic | Claude 3.5 Sonnet | 长文本处理，安全性高 | 中等 |
| Google | Gemini Pro | 多模态支持 | 较低 |
| 本地 | Ollama | 免费，隐私安全 | 免费 |

---

## ⚙️ 完整配置示例

### `.env` 文件示例

```env
# 数据库配置
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"

# JWT 密钥
JWT_SECRET="your-secret-key-change-in-production"

# 服务端口
PORT=3001

# OpenAI 配置
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Anthropic 配置（可选）
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google 配置（可选）
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key-here
GOOGLE_MODEL=gemini-pro

# 默认使用的提供商
AI_PROVIDER=openai
```

---

## 🔒 安全注意事项

### 1. 不要提交 API Key 到 Git

**确保 `.env` 在 `.gitignore` 中：**

```gitignore
# .env
.env
.env.local
.env.*.local
```

### 2. 使用环境变量

- ✅ **正确：** 使用环境变量存储 API Key
- ❌ **错误：** 硬编码在代码中

### 3. 限制 API 使用

- 设置使用限额
- 监控 API 调用次数
- 定期检查账单

---

## 🧪 测试配置

### 测试 OpenAI API

```bash
# 使用 curl 测试
curl -X POST http://localhost:3001/api/ai/chat/simple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ]
  }'
```

### 检查环境变量

```bash
cd backend
# Windows PowerShell
$env:OPENAI_API_KEY

# Linux/Mac
echo $OPENAI_API_KEY
```

---

## ❓ 常见问题

### 问题 1：API Key 无效

**错误信息：** `Invalid API Key`

**解决方法：**
1. 检查 API Key 是否正确复制
2. 确认 API Key 没有过期
3. 检查账户余额是否充足

### 问题 2：模型不存在

**错误信息：** `Model not found`

**解决方法：**
1. 检查模型名称是否正确
2. 确认你的账户有权限使用该模型
3. 某些模型可能需要申请访问权限

### 问题 3：API 调用失败

**错误信息：** `API request failed`

**解决方法：**
1. 检查网络连接
2. 检查 API Key 是否正确
3. 查看 OpenAI 服务状态：https://status.openai.com/

---

## 📚 参考资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Anthropic API 文档](https://docs.anthropic.com/)
- [Google Gemini API 文档](https://ai.google.dev/docs)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)

---

## 🎉 完成！

配置完成后，重启后端服务，就可以开始使用大模型 API 了！

**下一步：**
1. 配置 API Key
2. 重启后端服务
3. 在聊天页面测试对话功能
