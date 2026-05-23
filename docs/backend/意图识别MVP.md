# 意图识别 MVP 设计与验证

## 1. 设计目标（最小验证）

- **输入**：用户单条文本。
- **输出**：一个预定义意图，用于后续分流（如不同回复策略、不同接口）。
- **MVP 目标**：用现有 AI 模型做“单轮话术 → 意图”分类，先验证流程和效果，再考虑规则/小模型等。

## 2. 意图集合（MVP）

| 意图       | 说明           | 示例         |
|------------|----------------|--------------|
| GREETING   | 打招呼         | 你好、在吗   |
| QUESTION   | 提问/咨询      | 怎么改密码？ |
| CHAT       | 闲聊           | 随便聊聊     |
| GOODBYE    | 告别           | 拜拜、再见   |
| QUERY_FUND | 查基金行情/涨跌 | 帮我看看 000001 最近涨得怎么样 |
| UNKNOWN    | 无法识别       | 乱码、无关   |

当意图为 `QUERY_FUND` 时，会从用户输入中抽取 6 位基金代码（如 000001），并在聊天流程中自动查询 mock 基金数据，由 AI 根据数据用自然语言回答。

## 3. 接口

- **地址**：`POST /api/ai/intent`
- **鉴权**：同现有 AI 接口（JWT）。
- **请求体**：`{ "message": "用户输入" }`，`message` 必填，建议长度 ≤ 500。
- **响应**：`{ "intent": "GREETING", "raw": "GREETING" }`
  - `intent`：归一化后的意图，必为上述 5 个之一。
  - `raw`：模型原始输出（可选，调试用）。

## 4. 实现要点（后端）

- 在 **AI 模块** 中：
  - DTO：`IntentRequestDto`（校验 `message`）、`IntentResponseDto`、常量 `INTENTS`。
  - `AiService.recognizeIntent(message)`：用 `generateText` 调用现有模型，system 里写明“只输出一个意图词”，`maxTokens` 设小（如 20），再根据返回文本做归一化（匹配到 `INTENTS` 之一，否则 `UNKNOWN`）。
  - 控制器：`POST /api/ai/intent` 调 `recognizeIntent`，返回 `IntentResponseDto`。

这样不引入新依赖，不训练新模型，只加一个接口和一个服务方法，便于快速验证。

## 5. 如何验证（MVP）

### 5.1 用脚本验证（推荐）

1. 启动后端：`cd backend && npm run dev`。
2. 登录前端或调登录接口，从 localStorage 或响应里拿到 JWT，设为环境变量 `TOKEN`。
3. 在 `backend` 目录执行：
   ```bash
   # Windows CMD
   set TOKEN=你的JWT
   node scripts/test-intent.mjs
   ```
   ```powershell
   # PowerShell
   $env:TOKEN="你的JWT"; node scripts/test-intent.mjs
   ```
4. 看控制台：多组输入对应输出的 `intent` 是否符合预期（如“你好”→GREETING，“拜拜”→GOODBYE）。

### 5.2 用 curl 验证

```bash
# 将 YOUR_JWT 换成真实 token
curl -X POST http://localhost:3001/api/ai/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d "{\"message\":\"你好\"}"
```

期望返回形如：`{"intent":"GREETING","raw":"GREETING"}`。

### 5.3 判定 MVP 是否通过

- 能调通接口、返回 200 和合法 `intent`。
- 对 5～10 条覆盖 GREETING/QUESTION/CHAT/GOODBYE/UNKNOWN 的句子，目测分类基本合理即可（不要求 100% 准确）。

## 6. 后续可扩展

- 增加/调整意图：改 `INTENTS` 与 system 提示词即可。
- 需要实体（如时间、地点）：可在提示词中要求模型多输出一个 JSON，再在服务里解析。
- 若延迟/成本敏感：再考虑规则引擎或小模型做一级分类，LLM 做兜底。
