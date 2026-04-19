import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

/** 与 AuthModule / JwtStrategy 保持一致 */
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Socket.IO 实时通道
 *
 * - 命名空间 `/realtime`，与 HTTP `/api` 前缀无关
 * - 连接时在 handshake.auth.token 传入与 REST 相同的 JWT
 * - 加入房间 user:<id>，持仓变更时推送 portfolio:update
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    const raw =
      (client.handshake.auth as { token?: string })?.token ??
      (typeof client.handshake.query.token === 'string'
        ? client.handshake.query.token
        : Array.isArray(client.handshake.query.token)
          ? client.handshake.query.token[0]
          : '');

    if (!raw) {
      this.logger.warn(`断开连接：未提供 token，socket=${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = jwt.verify(raw, JWT_SECRET) as jwt.JwtPayload & {
        sub?: number | string;
      };
      const sub = payload.sub;
      const userId =
        typeof sub === 'number'
          ? sub
          : typeof sub === 'string'
            ? parseInt(sub, 10)
            : NaN;
      if (!Number.isFinite(userId)) {
        client.disconnect(true);
        return;
      }

      (client.data as { userId: number }).userId = userId;
      void client.join(`user:${userId}`);
      client.emit('connected', {
        userId,
        message: '已加入实时通道（房间 user:' + userId + '）',
      });
      this.logger.log(`WS 已连接 userId=${userId} socket=${client.id}`);
    } catch {
      this.logger.warn(`JWT 无效，断开 socket=${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const uid = (client.data as { userId?: number }).userId;
    this.logger.log(`WS 断开 userId=${uid ?? '?'} socket=${client.id}`);
  }

  /** emit('client:ping') → 服务端 emit('pong') */
  @SubscribeMessage('client:ping')
  handleClientPing(@ConnectedSocket() client: Socket) {
    const userId = (client.data as { userId?: number }).userId;
    client.emit('pong', {
      t: Date.now(),
      userId: userId ?? null,
    });
  }

  /** 持仓写入成功后由 HoldingsService 调用，通知当前用户刷新 Dashboard */
  notifyPortfolioChanged(userId: number) {
    this.server.to(`user:${userId}`).emit('portfolio:update', {
      reason: 'holdings_changed',
      at: new Date().toISOString(),
    });
  }
}
