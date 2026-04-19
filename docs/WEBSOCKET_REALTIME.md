# WebSocket（Socket.IO）实时通道说明

本项目在 Nest 侧使用 **`@nestjs/platform-socket.io`**，浏览器使用 **`socket.io-client`**，实现 WebSocket 实时通信（采用 Socket.IO：基于 Engine.IO，默认先 HTTP 再升级到 WebSocket）。

## 服务端

- **命名空间**：`/realtime`（与 REST 全局前缀 `/api` 无关）
- **端口**：与 HTTP 相同，`http://localhost:3001`
- **鉴权**：连接时在 `handshake.auth.token` 传入与 REST 相同的 **JWT**（字符串）
- **事件**
  - 连接成功服务端会向该 socket 发送 `connected`
  - 持仓成功写入后会向房间 `user:<用户id>` 广播 **`portfolio:update`**
  - 客户端发送 **`client:ping`** → 服务端回复 **`pong`**（携带时间戳）

## 前端

- Dashboard 使用 `hooks/usePortfolioRealtime.ts` 连接 `http://localhost:3001/realtime`
- 环境变量 **`VITE_WS_ORIGIN`** 可覆盖默认 origins（便于部署）

## 调试

浏览器开发者工具 → **Network → WS**，可查看 Socket.IO 帧。
