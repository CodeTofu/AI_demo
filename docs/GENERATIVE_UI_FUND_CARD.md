# AI 基金分析 Agent - Generative UI 说明文档

本文档描述「基金数据卡片 + 收益折线图」Generative UI 的改动内容与实现步骤。

---

## 一、功能概述

当用户在聊天中询问某只基金（如输入「000001 怎么样」）时：

1. AI 会调用 **getFundDetails** 工具获取真实基金数据。
2. **调用中**：对话里显示「正在调取实时行情数据...」的 Loading 状态。
3. **返回后**：在该条 AI 消息下方自动渲染一张**基金数据卡片**，包含：
   - 基金名称、代码、风险等级
   - 单位净值、日涨跌幅
   - **近 7 日收益率折线图**（Recharts AreaChart，涨绿跌红）

AI 仍会根据这些数据继续生成文字总结（maxSteps=5 不变）。

---

## 二、改动清单

| 层级 | 文件 | 改动类型 |
|------|------|----------|
| 后端 | `backend/src/fund/fund.service.ts` | 修改：增加 chartData、buildChartData |
| 前端 | `frontend/src/types/fund.ts` | 新增：类型定义 |
| 前端 | `frontend/src/components/FundDataCard.tsx` | 新增：基金卡片组件 |
| 前端 | `frontend/src/components/FundDataCard.css` | 新增：卡片样式 |
| 前端 | `frontend/src/pages/Chat.tsx` | 修改：渲染工具结果与 Loading |
| 前端 | `frontend/src/pages/Chat.css` | 修改：Loading 样式 |

---

## 三、后端改动（步骤说明）

### 3.1 数据结构和返回内容

**文件**：`backend/src/fund/fund.service.ts`

1. **新增类型**
   - `FundChartDataPoint`：`{ date: string; value: number }`，用于单日收益率数据点。
   - 在 `FundInfo` 中增加字段：`chartData: FundChartDataPoint[]`。

2. **新增方法** `buildChartData(days, recentChange1d, netValue)`
   - 生成近 **7 天**的收益率序列。
   - `date` 格式：`MM-DD`。
   - `value`：相对序列起点的**累计收益率（%）**，带轻微随机波动，最后一天与 `recentChange1d` 趋势一致。
   - 用于前端折线图展示「近 7 日收益率」。

3. **修改** `getFundInfo(code)`
   - 在原有返回对象上增加：`chartData: this.buildChartData(7, recentChange1d, netValue)`。
   - `fallbackFundInfo` 中也返回 `chartData`（用默认参数生成），保证前端始终能拿到数组。

### 3.2 数据流

- 聊天接口 → `ChatService.stream()` → 模型决定调用 `getFundDetails` → 执行 `FundService.getFundInfo(code)` → 返回的 `FundInfo`（含 `chartData`）作为工具结果通过流式响应返回给前端。

---

## 四、前端改动（步骤说明）

### 4.1 类型定义

**文件**：`frontend/src/types/fund.ts`（新建）

- `FundChartDataPoint`：与后端一致，`date` + `value`。
- `FundInfoData`：与后端 `FundInfo` 一致，包含 `code`、`name`、`netValue`、`riskLevel`、`recentChange1d`、`recentChange1w`、`recentChange1m`、`manager`、`updatedAt`、`chartData`。
- 用途：保证 `FundDataCard` 和 Chat 页对工具返回结果做强类型约束。

### 4.2 基金数据卡片组件

**文件**：`frontend/src/components/FundDataCard.tsx`（新建）

- **Props**：`data: FundInfoData`。
- **结构**：
  - **头部**：基金名称（标题）、代码、风险等级（Badge，带 Info 图标）、日涨跌幅（带 TrendingUp 图标，跌时旋转 180°）。
  - **净值区**：单位净值。
  - **图表区**：Recharts 的 `AreaChart`，数据源为 `data.chartData`，X 轴为 `date`，Y 轴为 `value`（收益率 %）；涨用绿色、跌用红色，带渐变填充和 Tooltip。
  - **底部**：免责说明文案。
- **依赖**：`recharts`、`lucide-react`，样式用普通 CSS（见下）。

**文件**：`frontend/src/components/FundDataCard.css`（新建）

- 为卡片、标题、Meta、Badge、涨跌标签、净值、图表容器、底部等编写类名样式，实现金融产品风格（边框、阴影、颜色区分）。

### 4.3 聊天页集成

**文件**：`frontend/src/pages/Chat.tsx`

1. **类型与工具识别**
   - 定义 `GetFundDetailsPart` 类型（含 `type: 'tool-getFundDetails'` 及 `state`、`output` 等）。
   - 定义 `isGetFundDetailsPart(part)`，用于判断 part 是否为 getFundDetails 工具调用。

2. **消息渲染逻辑**
   - 对每条 **assistant** 消息，在原有「文本 / reasoning」渲染之外，遍历 `message.parts`：
     - 若 `part.type === 'tool-getFundDetails'` 且 **`state === 'output-available'`**：在该条消息下方渲染 `<FundDataCard data={part.output} />`。
     - 若 **`state === 'input-streaming'` 或 `'input-available'`**：渲染 Loading 区块，文案为「正在调取实时行情数据...」。
   - 卡片和 Loading 均渲染在该条 AI 消息的同一气泡/块内（消息下方）。

3. **其它**
   - `sendMessage` 改为使用 `parts: [{ type: 'text', text: input.trim() }]`，以符合当前 `useChat` 类型；后端已支持从 `parts` 解析 `content`，行为不变。
   - Loading 状态判断保持为 `String(status) === 'in_progress'`。

**文件**：`frontend/src/pages/Chat.css`

- 新增 `.fund-tool-loading`、`.fund-tool-loading-dot` 及动画，用于工具调用中的 Loading 展示。

---

## 五、约束与约定

- **强类型**：后端与前端共用同一数据结构约定（FundInfo / FundInfoData、FundChartDataPoint），Chat 页对 tool part 做类型收窄后再传给 `FundDataCard`。
- **UI 风格**：使用 CSS 实现卡片、Badge、图表配色，无 Shadcn，符合金融数据展示风格。
- **多步推理**：后端 `stopWhen: stepCountIs(5)` 未改，工具返回后 AI 仍可继续推理并输出文字总结。

---

## 六、使用方式

1. 启动后端：`cd backend && npm run dev`。
2. 启动前端：`cd frontend && npm run dev`。
3. 在聊天页输入例如：「000001 怎么样」「查一下 161725」。
4. 观察：先出现「正在调取实时行情数据...」，随后出现基金卡片和近 7 日收益折线图，AI 再基于数据给出文字分析。

---

## 七、相关文档

- 聊天与工具调用流程：[BACKEND_CHAT_FLOW.md](./BACKEND_CHAT_FLOW.md)
- 项目启动与配置：[START_PROJECT.md](./START_PROJECT.md)
