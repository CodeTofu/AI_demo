# 聊天接口：从前端发请求到返回的完整流程

面向前端同学，用「请求怎么进来 → 经过哪些步骤 → 怎么回到前端」的方式，把 **POST /api/chat** 这条链路捋清楚，并标注对应代码位置。

---

## 一、整体顺序（一句话版）

前端发 **POST /api/chat**（带 JWT 和 messages）→ 后端先做 **鉴权** → 进入 **ChatController** 解析 body、归一化消息格式 → **ChatService** 用 **streamText** 调 AI，并注册 **getFundDetails** 工具（多步推理，最多 5 步）→ 模型在需要时**自动调用工具**，由 **FundService** 查基金数据 → 流式结果通过 **pipeUIMessageStreamToResponse** 按 **SSE（UI 消息流）** 写回 Response → 前端 **useChat** 解析并渲染（含 Tool Calling 与文字流）。

下面按「接收 → 处理 → 返回」三步拆开说，并标出文件与行号。

---

## 二、请求是怎么进来的（路由与鉴权）

### 1. 入口：全局前缀 + 模块路由

- 在 **`backend/src/main.ts`** 里，所有接口都加了前缀 `api`：
  - 第 27 行：`app.setGlobalPrefix('api');`
- 所以前端请求的 **`/api/chat`** 实际对应后端的路径 **`/chat`**。

- **`backend/src/app.module.ts`** 里引入了 **AiModule**（第 7、10 行），**AiModule** 里注册了 **ChatController**，并注入 **ChatService**、引入 **FundModule**（见 `ai.module.ts`）。

- **`backend/src/ai/chat.controller.ts`**：
  - 第 17 行：`@Controller('chat')` → 处理路径 **`/chat`**，完整 URL 即 **`/api/chat`**。
  - 第 18 行：`@UseGuards(JwtAuthGuard)` → 先鉴权，再进方法。
  - 第 27 行：`@Post()` → 只处理 **POST** 请求。
  - 第 28 行：`async chat(@Body() body: any, @Res() res: Response)` → 请求体放在 `body`，用于写流式响应的对象是 `res`。

**小结**：前端 POST 到 `http://localhost:3001/api/chat`（或经 Vite 代理的 `http://localhost:3000/api/chat`）时，会落到 **ChatController 的 `chat` 方法**。

### 2. 鉴权：在进入 controller 之前

- 第 18 行：`@UseGuards(JwtAuthGuard)` 表示：**在执行 `chat` 方法之前**，先执行 **JwtAuthGuard**。
- **`backend/src/auth/jwt-auth.guard.ts`**（整文件）：守卫调用 Passport 的 `jwt` 策略。
- **`backend/src/auth/jwt.strategy.ts`**：
  - 从请求头里取 Token，约定格式是 **`Authorization: Bearer <token>`**（和前端在 DefaultChatTransport 的 `headers` 里传的一致）。
  - 校验签名和过期后，用 `payload.sub` 查用户是否存在；不存在就抛 `UnauthorizedException`，直接返回 **401**，不会进入 controller。

所以：**前端没带或带错 Token，请求会在这里被拦掉，返回 401，不会执行下面的业务逻辑。**

---

## 三、在 Controller 里做了什么（解析 body + 归一化消息）

通过鉴权后，才会执行 **`chat.controller.ts`** 里 `chat` 方法的方法体。

### 1. 从 body 里拿出「消息列表」

- 第 29 行：`let messages = body.messages || [];`  
  前端 useChat（DefaultChatTransport）发的是 JSON：`{ id, messages, trigger, messageId, ... }`，这里取的是 **messages** 数组。
- 第 31–37 行：若 `messages` 为空，会再尝试 `body` 本身是数组或 `body.message` 单条消息，保证能拿到「用户 + 历史消息」。

### 2. 归一化每条消息为 { role, content }

- 第 40–52 行：把每条消息整理成 **`{ role, content }`**，得到 **chatMessages**：
  - 优先用 `msg.content` 或 `msg.text`；
  - 若为空且存在 **`msg.parts`**（前端 UI 消息格式），则从 `parts` 里筛出 `type === 'text'` 的 `text` 拼成一段字符串。
  - 这样无论前端发的是「简单 content」还是「parts 数组」，后端都能得到统一的 `content` 字符串，供模型使用。

### 3. 调用 ChatService 流式接口并写回响应

- 第 54 行：把 **chatMessages** 包成 **ChatDto**：`{ messages: chatMessages }`。
- 第 56 行：**`const result = await this.chatService.stream(chatDto);`**  
  这里才真正去调 AI（streamText + 工具），返回一个「流式结果对象」**result**（见下一节）。
- 第 57 行：**`result.pipeUIMessageStreamToResponse(res as any);`**  
  把 AI SDK 的 **UI 消息流**（含文字、Tool Calling、Tool Result 等）按约定格式（SSE）写入 **res**，直接写回给前端的 HTTP 响应体。写完后，这次请求就结束；前端会收到一条**流式响应**。

### 4. 错误处理

- 第 56–67 行：**try/catch** 包住 `stream` 和 `pipeUIMessageStreamToResponse`。
  - 若出错且 **headers 未发送**：返回 **500** 且 body 为 `{ error: "具体错误信息" }`，并在后端控制台打 `[ChatController] stream error:`。
  - 若出错且 **headers 已发送**（流已开始）：只记录日志并结束响应，避免二次写响应。

**小结**：Controller 只做四件事——解析 body → 归一化 messages（含 parts 兼容）→ 调 ChatService.stream → 把流写到 `res`（或出错时返回 500）。

---

## 四、ChatService 里做了什么（streamText + 工具 getFundDetails）

Controller 调用的 **`this.chatService.stream(chatDto)`** 在 **`backend/src/ai/chat.service.ts`**。

### 1. 获取模型（getModel）

- **位置**：**chat.service.ts 第 19–34 行**（私有方法）。
- **做什么**：从环境变量读 `OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`、`OPENAI_API_BASE` / `DEEPSEEK_API_BASE`、模型名（默认 `deepseek-chat`），用 **createOpenAI** 构造客户端，返回 **openaiClient.chat(modelName)**（兼容 DeepSeek / OpenAI 等）。
- 若 API Key 未配置或为空，会 **throw Error**，被 Controller 的 catch 捕获后返回 500。

### 2. streamText：消息 + 系统提示 + 工具 + 多步推理

- **位置**：**chat.service.ts 第 42–62 行**。
- **参数**：
  - **model**：上面 getModel() 的返回值。
  - **messages**：chatDto.messages，每条为 `{ role, content }`。
  - **system**：固定提示「基金分析助手；用户问基金代码相关信息/业绩/对比/风险时，必须调用 getFundDetails，不要猜测数据」。
  - **tools**：定义 **getFundDetails** 工具：
    - **description**：当用户询问基金代码（如 000001）的相关信息、业绩、对比或风险时，必须调用此工具，不要尝试猜测数据。
    - **inputSchema**：zod 约束 **code** 为 6 位数字字符串（`fundCodeSchema`）。
    - **execute**：`async (args: { code: string }) => this.fundService.getFundInfo(args.code)`，即由 **FundService** 按代码查基金数据并返回给模型。
  - **stopWhen: stepCountIs(5)**：多步推理，最多 5 步（模型可多次调用工具或继续生成，直到结束或达到步数上限）。

### 3. 工具执行与数据来源（FundService）

- **入口**：当模型在生成过程中决定「需要某只基金数据」时，会**自动**调用 **getFundDetails**，并传入它从用户话里识别的 **code**（6 位）。
- **执行**：**execute** 内部调用 **`this.fundService.getFundInfo(args.code)`**。
- **FundService**（**`backend/src/fund/fund.service.ts`**）：根据 code 查内存中的 mock 表，返回 `{ code, name, netValue, riskLevel, recentChange1d/1w/1m, manager, updatedAt }`；若 code 不存在则返回占位数据。后续可替换为真实数据库或外部 API。

模型拿到工具返回的 JSON 后，会基于这些数据生成自然语言回复，并继续通过同一流输出给前端。

### 4. 返回值

- **stream** 方法返回 **streamText** 的 result 对象（第 62 行做类型断言），该对象上有 **pipeUIMessageStreamToResponse(res)** 方法，在 Controller 里被调用来把「UI 消息流」写入 HTTP 响应。

**小结**：真正和「大模型」通信、生成内容并在需要时**自动调 getFundDetails**，是在 **ChatService.stream** 里完成的；Controller 只负责把已经生成好的流接到 **res** 上。

---

## 五、响应是怎么回到前端的（流式格式）

### 1. 谁在写响应体

- **Controller 第 57 行**：`result.pipeUIMessageStreamToResponse(res as any);`
- **res** 是 Nest 注入的 **Express Response**，即即将发回前端的 HTTP 响应。
- **pipeUIMessageStreamToResponse** 是 AI SDK 提供的方法：把内部的「UI 消息流」（text-delta、tool-call、tool-result、reasoning 等）转成前端约定好的 **SSE（Server-Sent Events）** 格式，**持续往 res 里写**，直到流结束。

### 2. 前端实际收到什么

- **Content-Type**：由 SDK 设置为 **text/event-stream** 等 SSE 约定。
- **Body**：多行 **`data: {"type":"...", ...}`** 的 SSE 事件（如 `text-delta`、`tool-call`、`tool-result` 等）；前端 **useChat** 会解析成 **message.parts**，再按 `type === 'text'` / `'reasoning'` / 工具调用等渲染，实现「打字机效果」和工具调用展示。

所以你作为前端：**只要用 useChat 接 /api/chat，不用自己解析 SSE**；后端写出的就是 useChat 能识别的 **UI 消息流** 格式（含 Tool Calling 与文字流）。

### 3. 从「请求结束」的角度

- 当 **pipeUIMessageStreamToResponse** 把整条流都写进 **res** 并关闭流时，这次 **POST /api/chat** 的 HTTP 响应就结束。
- 前端会先收到 200 + headers，然后持续收 body 里的 SSE 数据，直到 stream 结束。

---

## 六、按文件 + 行号速查表（方便对着代码看）

| 步骤 | 说明 | 文件 | 大致行号 |
|------|------|------|----------|
| 全局前缀 | 所有接口加 `/api` | `main.ts` | 27 |
| 路由 | POST /api/chat 对应 ChatController | `chat.controller.ts` | 17, 27–28 |
| 鉴权 | 校验 Authorization: Bearer &lt;token&gt;，失败 401 | `jwt-auth.guard.ts` + `jwt.strategy.ts` | guard 整文件；strategy 内 |
| 取 messages | 从 body 取 messages，兼容数组/单条 | `chat.controller.ts` | 29–37 |
| 归一化消息 | content / text / parts → { role, content } | `chat.controller.ts` | 40–52 |
| 调流式接口 | ChatService.stream(chatDto) | `chat.controller.ts` | 54–56 |
| 写回前端 | pipeUIMessageStreamToResponse(res) | `chat.controller.ts` | 57 |
| 错误处理 | try/catch，500 或结束流 | `chat.controller.ts` | 56–67 |
| 模型与 streamText | getModel() + streamText( messages, system, tools, stopWhen ) | `chat.service.ts` | 19–34, 42–62 |
| getFundDetails 工具 | description、inputSchema(zod)、execute | `chat.service.ts` | 50–59 |
| 工具执行 | FundService.getFundInfo(code) | `fund.service.ts` | getFundInfo |
| 多步推理 | stopWhen: stepCountIs(5) | `chat.service.ts` | 60 |

---

## 七、和前端的对应关系（便于联调）

- **你发**：**POST /api/chat**，headers 里 **Authorization: Bearer &lt;token&gt;**，body 里 **`{ messages: [ ... ], id?, trigger?, messageId? }`**（useChat 的 DefaultChatTransport 会带上这些）。消息可以是 `{ role, content }` 或带 **parts** 的 UI 消息格式。
- **后端顺序**：鉴权 → 解析并归一化 messages → **ChatService.stream**（streamText + getFundDetails + 多步推理）→ **pipeUIMessageStreamToResponse(res)** 把流写回。
- **你收**：同一条 HTTP 响应，body 是 **SSE 流**（含文字与 Tool Calling），useChat 解析成 **message.parts** 并渲染；若 **401** 则是鉴权失败，不会进 chat 方法；若 **500** 则 body 为 `{ error: "..." }`（仅在未开始写流时）。

如果你希望，我也可以再写一个「只画流程图 / 只列调用栈」的极简版，或者按「用户问 000001 怎么样」这一条用例从发请求到看到回复再走一遍纯文字版。
