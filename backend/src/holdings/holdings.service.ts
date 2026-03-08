import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FundService } from '../fund/fund.service';

/** 用户只需提供当前持仓 + 持仓收益，不询问份额或成本单价 */
export interface RecordHoldingInput {
  code: string;
  /** 当前持仓（市值，元） */
  currentValue: number;
  /** 持仓收益（元） */
  profitLoss: number;
}

/** 单条持仓仅展示：当前持仓、持仓收益、持仓收益率（不展示份额） */
export interface HoldingWithProfit {
  id: number;
  code: string;
  name: string;
  /** 当前持仓（市值） */
  currentValue: number;
  /** 持仓收益 */
  profitLoss: number;
  /** 持仓收益率 */
  profitLossPercent: string;
}

export interface AnalyzePortfolioResult {
  holdings: HoldingWithProfit[];
  totalCost: number;
  totalCurrent: number;
  totalProfitLoss: number;
  totalProfitLossPercent: string;
}

@Injectable()
export class HoldingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundService: FundService,
  ) {}

  /**
   * 记录一笔持仓：用户只提供当前持仓 + 持仓收益，由实时净值反推 costTotal/costPrice 存入，不询问份额
   */
  async recordHolding(
    userId: number,
    input: RecordHoldingInput,
  ): Promise<{
    ok: boolean;
    message: string;
    holding?: {
      id: number;
      code: string;
      name: string;
      currentValue: number;
      profitLoss: number;
      profitLossPercent: string;
    };
  }> {
    const { code, currentValue, profitLoss } = input;
    if (currentValue <= 0) {
      return { ok: false, message: '当前持仓金额必须大于 0' };
    }
    const costTotal = currentValue - profitLoss;
    if (costTotal <= 0) {
      return { ok: false, message: '根据当前持仓与收益推算出的成本必须大于 0，请检查收益是否填写正确' };
    }

    let name = `基金${code}`;
    let currentPrice = 1;
    try {
      const info = await this.fundService.getFundInfo(code);
      if (info?.name && info.name !== `基金${code}`) name = info.name;
      const p = parseFloat(info.netValue);
      if (!Number.isNaN(p) && p > 0) currentPrice = p;
    } catch {
      // 保留默认
    }

    const amount = currentValue / currentPrice;
    const costPrice = amount > 0 ? costTotal / amount : costTotal;

    const holding = await this.prisma.holding.create({
      data: { code, name, costTotal, costPrice, userId },
    });

    const profitLossPercent =
      costTotal > 0
        ? ((profitLoss / costTotal) * 100).toFixed(2) + '%'
        : '0%';

    return {
      ok: true,
      message: `已记录持仓：${name}（${code}），当前持仓 ¥${currentValue.toFixed(2)}，持仓收益 ${profitLoss >= 0 ? '+' : ''}¥${profitLoss.toFixed(2)}，收益率 ${profitLoss >= 0 ? '+' : ''}${profitLossPercent}`,
      holding: {
        id: holding.id,
        code: holding.code,
        name: holding.name,
        currentValue,
        profitLoss,
        profitLossPercent: (profitLoss >= 0 ? '+' : '') + profitLossPercent,
      },
    };
  }

  /**
   * 查询当前用户所有持仓，仅返回当前持仓、持仓收益、持仓收益率（不返回份额）
   */
  async analyzePortfolio(userId: number): Promise<AnalyzePortfolioResult> {
    const list = await this.prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const holdings: HoldingWithProfit[] = [];
    let totalCost = 0;
    let totalCurrent = 0;

    for (const h of list) {
      totalCost += h.costTotal;
      const amount = h.costTotal / h.costPrice;
      let currentPrice = h.costPrice;
      try {
        const info = await this.fundService.getFundInfo(h.code);
        const p = parseFloat(info.netValue);
        if (!Number.isNaN(p)) currentPrice = p;
      } catch {
        // 保留成本价
      }
      const currentValue = amount * currentPrice;
      totalCurrent += currentValue;
      const profitLoss = currentValue - h.costTotal;
      const profitLossPercent =
        h.costTotal > 0
          ? ((profitLoss / h.costTotal) * 100).toFixed(2) + '%'
          : '0%';

      holdings.push({
        id: h.id,
        code: h.code,
        name: h.name,
        currentValue,
        profitLoss,
        profitLossPercent: (profitLoss >= 0 ? '+' : '') + profitLossPercent,
      });
    }

    const totalProfitLoss = totalCurrent - totalCost;
    const totalProfitLossPercent =
      totalCost > 0
        ? ((totalProfitLoss / totalCost) * 100).toFixed(2) + '%'
        : '0%';

    return {
      holdings,
      totalCost,
      totalCurrent,
      totalProfitLoss,
      totalProfitLossPercent: (totalProfitLoss >= 0 ? '+' : '') + totalProfitLossPercent,
    };
  }
}
