import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Chat 控制器
 * POST /api/chat：流式聊天（带 getFundDetails 工具），将 Tool Calling 与文字流实时写入响应。
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat
   * 使用 ChatService 的 streamText + getFundDetails 工具，通过 pipeUIMessageStreamToResponse 将
   * AI 的 Tool Calling 信令及文字流实时传输给前端。
   */
  @Post()
  async chat(@Body() body: any, @Res() res: Response) {
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
      const result = await this.chatService.stream(chatDto);
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
