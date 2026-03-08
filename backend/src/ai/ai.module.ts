import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ChatController } from './chat.controller';
import { AiService } from './ai.service';
import { ChatService } from './chat.service';
import { FundModule } from '../fund/fund.module';
import { HoldingsModule } from '../holdings/holdings.module';

/**
 * AI 模块
 * 提供 AI 聊天功能；/api/chat 由 ChatService + getFundDetails / recordHolding / analyzePortfolio 工具提供流式 Agent 能力。
 */
@Module({
  imports: [FundModule, HoldingsModule],
  controllers: [AiController, ChatController],
  providers: [AiService, ChatService],
  exports: [AiService],
})
export class AiModule {}
