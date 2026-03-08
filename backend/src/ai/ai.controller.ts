import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { IntentRequestDto } from './dto/intent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * AI 控制器
 * 处理 AI 相关的 HTTP 请求
 */
@Controller('ai')
@UseGuards(JwtAuthGuard) // 需要认证才能使用 AI 功能
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/ai/chat
   * 流式聊天接口
   * 返回流式响应，实现打字机效果
   */
  @Post('chat')
  async chat(@Body() body: any, @Res() res: Response) {
    // useChat 发送的请求体格式可能不同，需要适配
    let messages = body.messages || [];
    
    // 如果 messages 为空，尝试从其他字段获取
    if (!messages || messages.length === 0) {
      // useChat 可能直接发送消息数组
      if (Array.isArray(body)) {
        messages = body;
      } else if (body.message) {
        // 单个消息格式
        messages = [{ role: 'user', content: body.message }];
      }
    }

    // 构建 ChatDto
    const chatDto: ChatDto = {
      messages: messages.map((msg: any) => ({
        role: msg.role || 'user',
        content: msg.content || msg.text || '',
      })),
    };

    const result = await this.aiService.streamChat(chatDto);

    // 获取流式响应
    const streamResponse = result.toTextStreamResponse();

    // 设置响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 读取流并写入响应
    if (streamResponse.body) {
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (error) {
        console.error('Stream error:', error);
        res.end();
      }
    } else {
      res.end();
    }
  }

  /**
   * POST /api/ai/chat/simple
   * 简单聊天接口（非流式）
   * 一次性返回完整结果
   */
  @Post('chat/simple')
  @HttpCode(HttpStatus.OK)
  async simpleChat(@Body() chatDto: ChatDto) {
    return this.aiService.chat(chatDto);
  }

  /**
   * POST /api/ai/intent
   * 意图识别（MVP）：对单条用户输入做意图分类
   */
  @Post('intent')
  @HttpCode(HttpStatus.OK)
  async intent(@Body() dto: IntentRequestDto) {
    return this.aiService.recognizeIntent(dto.message);
  }
}
