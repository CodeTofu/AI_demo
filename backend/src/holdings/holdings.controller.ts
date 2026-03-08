import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HoldingsService, GetSummaryResult } from './holdings.service';

@Controller('holdings')
@UseGuards(JwtAuthGuard)
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

  /**
   * GET /api/holdings/summary
   * 总览：总本金、总市值、总盈亏、盈亏率、持仓明细（批量实时净值）
   */
  @Get('summary')
  async getSummary(@Req() req: Request): Promise<GetSummaryResult> {
    const userId = (req as any).user?.id;
    if (userId == null) {
      throw new Error('未登录');
    }
    return this.holdingsService.getSummary(userId);
  }
}
