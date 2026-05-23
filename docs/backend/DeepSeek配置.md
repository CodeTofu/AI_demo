# 🚀 DeepSeek API 配置指南

## 📋 关于 DeepSeek

DeepSeek 是一个兼容 OpenAI API 格式的大模型提供商，提供高性能的中文和英文对话能力。

**优势：**
- ✅ 兼容 OpenAI API 格式，无需修改代码
- ✅ 支持中文对话，效果优秀
- ✅ 价格相对较低
- ✅ 响应速度快

---

## 🔧 快速配置

### 步骤 1：配置环境变量

在 `backend/.env` 文件中添加：

```env
# DeepSeek API Key
DEEPSEEK_API_KEY=sk-9896efbe1a544363a1746154dcbfd077

# DeepSeek API 基础地址
DEEPSEEK_API_BASE=https://api.deepseek.com/v1

# DeepSeek 模型名称（可选，默认为 deepseek-chat）
DEEPSEEK_MODEL=deepseek-chat
```

**或者使用 OPENAI_ 前缀（代码会自动识别）：**

```env
# 使用 OPENAI_ 前缀也可以（代码会自动识别 DeepSeek）
OPENAI_API_KEY=sk-9896efbe1a544363a1746154dcbfd077
OPENAI_API_BASE=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### 步骤 2：重启后端服务

```bash
cd backend
# 停止当前服务（Ctrl + C）
npm run dev
```

### 步骤 3：测试

访问 `http://localhost:3000/chat`，发送消息测试 DeepSeek 是否正常工作。

---

## 📝 完整配置示例

### `.env` 文件示例

```env
# 数据库配置
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"

# JWT 密钥
JWT_SECRET="your-secret-key-change-in-production"

# 服务端口
PORT=3001

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-9896efbe1a544363a1746154dcbfd077
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

---

## 🎯 可用的 DeepSeek 模型

- `deepseek-chat` - 默认模型，适合对话
- `deepseek-coder` - 代码生成专用模型

**修改模型：** 在 `.env` 中设置 `DEEPSEEK_MODEL=deepseek-coder` 即可。

---

## 🔄 切换回 OpenAI

如果想切换回 OpenAI，只需修改 `.env` 文件：

```env
# 使用 OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
# 不设置 OPENAI_API_BASE（使用默认的 OpenAI 地址）
OPENAI_MODEL=gpt-3.5-turbo
```

---

## ✅ 验证配置

### 方法 1：查看后端日志

启动后端服务后，如果配置正确，不会有错误信息。

### 方法 2：测试 API

在聊天页面发送消息，如果收到回复，说明配置成功。

### 方法 3：检查网络请求

打开浏览器开发者工具（F12）> Network 标签，查看 API 请求：
- 请求地址应该是 `https://api.deepseek.com/v1/chat/completions`
- 状态码应该是 200

---

## ❓ 常见问题

### 问题 1：API Key 无效

**错误信息：** `Invalid API Key` 或 `401 Unauthorized`

**解决方法：**
1. 检查 API Key 是否正确复制
2. 确认 API Key 没有过期
3. 检查账户余额是否充足

### 问题 2：连接失败

**错误信息：** `Failed to fetch` 或网络错误

**解决方法：**
1. 检查网络连接
2. 确认 `DEEPSEEK_API_BASE` 配置正确
3. 检查防火墙设置

### 问题 3：模型不存在

**错误信息：** `Model not found`

**解决方法：**
1. 检查模型名称是否正确
2. 确认你的账户有权限使用该模型
3. 尝试使用 `deepseek-chat`（默认模型）

---

## 🎉 完成！

配置完成后，重启后端服务，就可以使用 DeepSeek 进行对话了！

**优势：**
- ✅ 中文对话效果优秀
- ✅ 价格相对较低
- ✅ 响应速度快
- ✅ 完全兼容 OpenAI API

---

## 📚 参考资源

- [DeepSeek 官网](https://www.deepseek.com/)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [DeepSeek 模型列表](https://platform.deepseek.com/models)
