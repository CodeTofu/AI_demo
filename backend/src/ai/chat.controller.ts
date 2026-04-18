import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

    const chatMessages = messages.map((msg: any) => {
      let content = msg.content ?? msg.text ?? '';
      if (content === '' && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((p: any) => p.type === 'text' && p.text != null)
          .map((p: any) => p.text)
          .join('');
      }
      return {
        role: (msg.role || 'user') as 'user' | 'assistant' | 'system',
        content: String(content),
      };
    });

    const chatDto: ChatDto = { messages: chatMessages };

    try {
      const result = await this.chatService.stream(chatDto, userId);
      result.pipeUIMessageStreamToResponse(res as any);
    } catch (err) {
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
