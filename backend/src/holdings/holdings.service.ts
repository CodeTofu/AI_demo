import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FundInfo } from '../fund/fund.service';
import { FundService } from '../fund/fund.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/** 用户只需提供当前持仓 + 持仓收益，不询问份额或成本单价 */
export interface RecordHoldingInput {
  code: string;
  /** 当前持仓（市值，元） */
  currentValue: number;
  /** 持仓收益（元） */
  profitLoss: number;
}

/** 更新持仓时无需再传基金代码 */
export type UpdateHoldingInput = Pick<RecordHoldingInput, 'currentValue' | 'profitLoss'>;

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

/** 总览接口：聚合总资产、总收益、日收益、持仓明细（批量拉取实时净值） */
export interface SummaryHoldingItem {
  id: number;
  code: string;
  name: string;
  costTotal: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: string;
  /** 占比（占当前总市值） */
  sharePercent: number;
  /**
   * 估算昨日收益（元）：持仓市值 × 该基金最近披露日涨跌幅（与天天基金 `recentChange1d` 同源）。
   * 接口无涨跌幅时为 null。
   */
  yesterdayProfit: number | null;
}

export interface GetSummaryResult {
  totalInvestment: number;
  totalValue: number;
  totalProfit: number;
  profitRate: string;
  /** 持仓只数 */
  holdingCount: number;
  /**
   * 昨日总盈亏估算（元）：各持仓昨日收益之和；无日涨跌幅数据时为 null。
   */
  yesterdayTotalProfit: number | null;
  holdings: SummaryHoldingItem[];
}

/** 解析基金接口返回的日涨跌幅字符串（如 +1.23%、—）为数值（百分比数字，非小数） */
function parseDailyPercentFromDisplay(raw: string | undefined): number | null {
  if (raw == null || String(raw).trim() === '' || String(raw).trim() === '—') {
    return null;
  }
  const n = parseFloat(String(raw).replace(/[+%\s]/g, ''));
  return Number.isNaN(n) ? null : n;
}

type HoldingRow = {
  id: number;
  code: string;
  name: string;
  costTotal: number;
  costPrice: number;
};

@Injectable()
export class HoldingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundService: FundService,
    private readonly realtime: RealtimeGateway,
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

    this.realtime.notifyPortfolioChanged(userId);

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
   * 新增或更新：同一用户下同一代码仅一条持仓；已存在则更新市值与收益，否则新增。
   */
  async recordOrUpdateHolding(
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
    updated?: boolean;
  }> {
    const existing = await this.prisma.holding.findFirst({
      where: { userId, code: input.code },
      select: { id: true },
    });
    if (existing) {
      const u = await this.updateHolding(userId, existing.id, {
        currentValue: input.currentValue,
        profitLoss: input.profitLoss,
      });
      if (!u.ok) return { ...u, updated: true };
      return {
        ok: true,
        message: `${u.message}（该基金已有记录，本次为截图同步覆盖更新）`,
        holding: u.holding,
        updated: true,
      };
    }
    const r = await this.recordHolding(userId, input);
    if (!r.ok) return r;
    return { ...r, updated: false };
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

  /**
   * 每次拉取总览时，用最新净值按「编辑持仓」同一规则反推 costPrice，并更新基金名称入库，避免库内长期停留在旧净值。
   */
  private async persistHoldingsFromLatestQuotes(
    userId: number,
    list: HoldingRow[],
    priceByCode: Map<string, number>,
    infoByCode: Map<string, FundInfo>,
  ): Promise<void> {
    let changed = false;
    for (const h of list) {
      const info = infoByCode.get(h.code);
      const nav = priceByCode.get(h.code) ?? 0;
      const navOk = Number.isFinite(nav) && nav > 0;

      let nameNext = h.name;
      if (info?.name && info.name !== `基金${h.code}`) {
        nameNext = info.name;
      }

      if (!navOk) {
        if (nameNext !== h.name) {
          await this.prisma.holding.update({
            where: { id: h.id },
            data: { name: nameNext },
          });
          changed = true;
        }
        continue;
      }

      const costPriceRef = h.costPrice > 0 ? h.costPrice : 1;
      const amount = h.costTotal / costPriceRef;
      const currentValue = amount * nav;
      const amountShares = currentValue / nav;
      const costPriceNew =
        amountShares > 0 ? h.costTotal / amountShares : costPriceRef;

      const priceChanged = Math.abs(costPriceNew - h.costPrice) > 1e-6;
      const nameChanged = nameNext !== h.name;
      if (!priceChanged && !nameChanged) continue;

      await this.prisma.holding.update({
        where: { id: h.id },
        data: { name: nameNext, costPrice: costPriceNew },
      });
      changed = true;
    }

    if (changed) {
      this.realtime.notifyPortfolioChanged(userId);
    }
  }

  /**
   * 总览：聚合总本金、总市值、总盈亏、盈亏率；批量请求实时净值（Promise.all）返回持仓明细
   */
  async getSummary(userId: number): Promise<GetSummaryResult> {
    const list = await this.prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (list.length === 0) {
      return {
        totalInvestment: 0,
        totalValue: 0,
        totalProfit: 0,
        profitRate: '0%',
        holdingCount: 0,
        yesterdayTotalProfit: null,
        holdings: [],
      };
    }

    const uniqueCodes = [...new Set(list.map((h) => h.code))];
    const fundInfos = await Promise.all(
      uniqueCodes.map((code) => this.fundService.getFundInfo(code)),
    );
    const priceByCode = new Map<string, number>();
    const dailyPctByCode = new Map<string, number | null>();
    uniqueCodes.forEach((code, i) => {
      const p = parseFloat(fundInfos[i]?.netValue ?? '0');
      priceByCode.set(code, Number.isNaN(p) ? 0 : p);
      dailyPctByCode.set(code, parseDailyPercentFromDisplay(fundInfos[i]?.recentChange1d));
    });

    const infoByCode = new Map<string, FundInfo>();
    uniqueCodes.forEach((code, i) => {
      if (fundInfos[i]) infoByCode.set(code, fundInfos[i]);
    });

    await this.persistHoldingsFromLatestQuotes(userId, list, priceByCode, infoByCode);

    let totalInvestment = 0;
    let totalValue = 0;
    const holdings: SummaryHoldingItem[] = [];

    for (const h of list) {
      const info = infoByCode.get(h.code);
      const displayName =
        info?.name && info.name !== `基金${h.code}` ? info.name : h.name;
      const currentPrice = priceByCode.get(h.code) ?? h.costPrice;
      const costPriceRef = h.costPrice > 0 ? h.costPrice : 1;
      const amount = h.costTotal / costPriceRef;
      const currentValue = amount * (currentPrice || costPriceRef);
      const profitLoss = currentValue - h.costTotal;
      const profitLossPercent =
        h.costTotal > 0
          ? ((profitLoss / h.costTotal) * 100).toFixed(2) + '%'
          : '0%';

      totalInvestment += h.costTotal;
      totalValue += currentValue;

      const dailyPct = dailyPctByCode.get(h.code);
      const yesterdayProfit =
        dailyPct != null && currentValue > 0
          ? Math.round(((currentValue * dailyPct) / 100) * 100) / 100
          : null;

      holdings.push({
        id: h.id,
        code: h.code,
        name: displayName,
        costTotal: h.costTotal,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent: (profitLoss >= 0 ? '+' : '') + profitLossPercent,
        sharePercent: 0,
        yesterdayProfit,
      });
    }

    const totalProfit = totalValue - totalInvestment;
    const profitRate =
      totalInvestment > 0
        ? ((totalProfit / totalInvestment) * 100).toFixed(2) + '%'
        : '0%';

    holdings.forEach((item) => {
      item.sharePercent =
        totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0;
    });

    let yesterdaySum = 0;
    let yesterdayAny = false;
    for (const item of holdings) {
      if (item.yesterdayProfit != null) {
        yesterdaySum += item.yesterdayProfit;
        yesterdayAny = true;
      }
    }
    const yesterdayTotalProfit = yesterdayAny
      ? Math.round(yesterdaySum * 100) / 100
      : null;

    return {
      totalInvestment,
      totalValue,
      totalProfit,
      profitRate: (totalProfit >= 0 ? '+' : '') + profitRate,
      holdingCount: holdings.length,
      yesterdayTotalProfit,
      holdings,
    };
  }

  /**
   * 更新持仓：规则与 recordHolding 相同（当前持仓市值 + 持仓收益 → 反推 costTotal / costPrice）
   */
  async updateHolding(
    userId: number,
    holdingId: number,
    input: UpdateHoldingInput,
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
    const existing = await this.prisma.holding.findFirst({
      where: { id: holdingId, userId },
    });
    if (!existing) {
      return { ok: false, message: '持仓不存在或无权操作' };
    }

    const { currentValue, profitLoss } = input;
    if (currentValue <= 0) {
      return { ok: false, message: '当前持仓金额必须大于 0' };
    }
    const costTotal = currentValue - profitLoss;
    if (costTotal <= 0) {
      return {
        ok: false,
        message: '根据当前持仓与收益推算出的成本必须大于 0，请检查收益是否填写正确',
      };
    }

    const code = existing.code;
    let name = existing.name;
    let currentPrice = existing.costPrice > 0 ? existing.costPrice : 1;
    try {
      const info = await this.fundService.getFundInfo(code);
      if (info?.name && info.name !== `基金${code}`) name = info.name;
      const p = parseFloat(info.netValue);
      if (!Number.isNaN(p) && p > 0) currentPrice = p;
    } catch {
      // 保留已有名称与价格参考
    }

    const amount = currentValue / currentPrice;
    const costPrice = amount > 0 ? costTotal / amount : costTotal;

    const holding = await this.prisma.holding.update({
      where: { id: holdingId },
      data: { name, costTotal, costPrice },
    });

    const profitLossPercent =
      costTotal > 0 ? ((profitLoss / costTotal) * 100).toFixed(2) + '%' : '0%';

    this.realtime.notifyPortfolioChanged(userId);

    return {
      ok: true,
      message: `已更新持仓：${name}（${code}），当前持仓 ¥${currentValue.toFixed(2)}，持仓收益 ${profitLoss >= 0 ? '+' : ''}¥${profitLoss.toFixed(2)}，收益率 ${profitLoss >= 0 ? '+' : ''}${profitLossPercent}`,
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

  async deleteHolding(
    userId: number,
    holdingId: number,
  ): Promise<{ ok: boolean; message: string }> {
    const result = await this.prisma.holding.deleteMany({
      where: { id: holdingId, userId },
    });
    if (result.count === 0) {
      return { ok: false, message: '持仓不存在或无权操作' };
    }
    this.realtime.notifyPortfolioChanged(userId);
    return { ok: true, message: '已删除该持仓' };
  }

  /** 按 6 位基金代码删除该用户下对应持仓（同代码多条则一并删） */
  async deleteHoldingByCode(
    userId: number,
    code: string,
  ): Promise<{ ok: boolean; message: string; deletedCount: number }> {
    const result = await this.prisma.holding.deleteMany({
      where: { userId, code },
    });
    if (result.count === 0) {
      return { ok: false, message: '未找到该基金代码的持仓', deletedCount: 0 };
    }
    this.realtime.notifyPortfolioChanged(userId);
    return {
      ok: true,
      message: `已删除基金 ${code} 的持仓，共 ${result.count} 条`,
      deletedCount: result.count,
    };
  }

  /** 清空当前用户全部持仓 */
  async deleteAllHoldings(
    userId: number,
  ): Promise<{ ok: boolean; message: string; deletedCount: number }> {
    const result = await this.prisma.holding.deleteMany({ where: { userId } });
    this.realtime.notifyPortfolioChanged(userId);
    return {
      ok: true,
      message:
        result.count === 0
          ? '当前本就没有持仓记录'
          : `已清空全部持仓，共删除 ${result.count} 条`,
      deletedCount: result.count,
    };
  }
}
