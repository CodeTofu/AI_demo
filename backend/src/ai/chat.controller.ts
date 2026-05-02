import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UIMessage } from 'ai';

/**
 * Chat 控制器
 * POST /api/chat：流式聊天（getFundDetails / recordHolding / analyzePortfolio），需登录，userId 用于持仓管理。
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat
   * 从 JWT 取当前用户 id，传入 stream 以支持持仓记录与组合分析。
   */
  @Post()
  async chat(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    if (userId == null) {
      res.status(401).json({ error: '未登录或用户无效' });
      return;
    }
    let messages = body.messages || [];

    if (!messages || messages.length === 0) {
      if (Array.isArray(body)) {
        messages = body;
      } else if (body.message) {
        messages = [{ role: 'user', content: body.message }];
      }
    }

    const uiMessages: Omit<UIMessage, 'id'>[] = messages.map((msg: any) => {
      const { id: _id, ...rest } = msg;
      if (Array.isArray(msg.parts) && msg.parts.length > 0) {
        return rest;
      }
      const text = String(msg.content ?? msg.text ?? '');
      return {
        role: msg.role || 'user',
        parts: [{ type: 'text' as const, text }],
      };
    });

    try {
      const result = await this.chatService.stream(uiMessages, userId);
      result.pipeUIMessageStreamToResponse(res as any);
    } catch (err) {
      if (err instanceof HttpException) {
        const status = err.getStatus();
        const body = err.getResponse();
        const msg = (() => {
          if (typeof body === 'string') return body;
          if (typeof body === 'object' && body !== null && 'message' in body) {
            const m = (body as { message: string | string[] }).message;
            return Array.isArray(m) ? m.join(', ') : String(m);
          }
          return err.message;
        })();
        console.error('[ChatController] stream error:', msg, err);
        if (!res.headersSent) {
          res.status(status).json({ error: msg });
        } else {
          res.end();
        }
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ChatController] stream error:', message, err);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      } else {
        res.end();
      }
    }
  }
}
