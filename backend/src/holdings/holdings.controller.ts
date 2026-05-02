import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HoldingsService, GetSummaryResult } from './holdings.service';
import { UpdateHoldingDto } from './dto/update-holding.dto';

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

  /** PATCH /api/holdings/:id — 更新持仓市值与收益（与 AI 记账规则一致） */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHoldingDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    if (userId == null) throw new Error('未登录');
    const r = await this.holdingsService.updateHolding(userId, id, dto);
    if (!r.ok) {
      if (r.message.includes('不存在')) throw new NotFoundException(r.message);
      throw new BadRequestException(r.message);
    }
    return r;
  }

  /** DELETE /api/holdings/:id — 删除一条持仓 */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user?.id;
    if (userId == null) throw new Error('未登录');
    const r = await this.holdingsService.deleteHolding(userId, id);
    if (!r.ok) {
      throw new NotFoundException(r.message);
    }
    return r;
  }
}
