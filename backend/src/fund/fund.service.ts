import { Injectable } from '@nestjs/common';

/**
 * 基金信息（来自天天基金 Eastmoney API）
 */
export interface FundInfo {
  code: string;
  name: string;
  netValue: string;
  riskLevel: string;
  recentChange1d: string;
  recentChange1w: string;
  recentChange1m: string;
  manager: string;
  updatedAt: string;
}

/** 天天基金实时行情接口返回（JSONP） */
interface FundGzResponse {
  fundcode?: string;
  name?: string;
  jzrq?: string; // 净值日期
  dwjz?: string; // 单位净值
  gsz?: string;  // 估算净值
  gszzl?: string; // 估算涨幅%
  gztime?: string;
}

/** 天天基金历史净值接口返回 */
interface LsjzItem {
  FSRQ: string; // 净值日期
  DWJZ: string; // 单位净值
  LJJZ?: string;
  JZZZL?: string; // 日增长率
}

interface LsjzApiResponse {
  Data?: { LSJZList?: LsjzItem[] };
}

const FUND_GZ_URL = 'http://fundgz.1234567.com.cn/js';
const LSJZ_URL = 'http://api.fund.eastmoney.com/f10/lsjz';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'http://fundf10.eastmoney.com/';

/**
 * 基金服务：使用天天基金（Eastmoney）API 获取真实基金数据
 */
@Injectable()
export class FundService {
  /**
   * 根据基金代码获取基金信息（调用天天基金 API）
   */
  async getFundInfo(code: string): Promise<FundInfo> {
    const fallback = this.fallbackFundInfo(code);
    try {
      const [gz, lsjzList] = await Promise.all([
        this.fetchFundGz(code),
        this.fetchFundLsjz(code),
      ]);

      if (!gz) return fallback;

      const netValue = gz.dwjz ?? gz.gsz ?? '—';
      const recentChange1d =
        gz.gszzl != null && gz.gszzl !== ''
          ? (Number(gz.gszzl) >= 0 ? '+' : '') + gz.gszzl + '%'
          : '—';

      const { change1w, change1m } = this.computeWeekMonthChange(
        netValue,
        gz.jzrq,
        lsjzList,
      );

      return {
        code: gz.fundcode ?? code,
        name: gz.name ?? `基金${code}`,
        netValue,
        riskLevel: '—', // 天天基金公开接口暂无，可后续接入 F10 详情
        recentChange1d,
        recentChange1w: change1w,
        recentChange1m: change1m,
        manager: '—', // 需 F10 或详情页接口
        updatedAt: gz.jzrq ?? new Date().toISOString().slice(0, 10),
      };
    } catch {
      return fallback;
    }
  }

  /** 实时行情（估算净值/涨幅） */
  private async fetchFundGz(code: string): Promise<FundGzResponse | null> {
    const url = `${FUND_GZ_URL}/${code}.js?rt=${Date.now()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const match = text.match(/jsonpgz\((.*)\)\s*;?\s*$/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]) as FundGzResponse;
    } catch {
      return null;
    }
  }

  /** 历史净值（用于计算周/月涨幅） */
  private async fetchFundLsjz(code: string): Promise<LsjzItem[]> {
    const url = `${LSJZ_URL}?callback=j&fundCode=${code}&pageIndex=1&pageSize=31`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: REFERER,
      },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const match = text.match(/j\((.*)\)\s*;?\s*$/);
    if (!match) return [];
    try {
      const data = JSON.parse(match[1]) as LsjzApiResponse;
      return data?.Data?.LSJZList ?? [];
    } catch {
      return [];
    }
  }

  /** 根据历史净值计算近 1 周、1 月涨幅 */
  private computeWeekMonthChange(
    currentNet: string,
    currentDateStr: string | undefined,
    list: LsjzItem[],
  ): { change1w: string; change1m: string } {
    const current = parseFloat(currentNet);
    if (Number.isNaN(current) || !list.length) return { change1w: '—', change1m: '—' };

    const sorted = [...list].sort(
      (a, b) => new Date(b.FSRQ).getTime() - new Date(a.FSRQ).getTime(),
    );
    const baseDate = currentDateStr ? new Date(currentDateStr) : new Date();
    const getNetAt = (daysAgo: number) => {
      const target = new Date(baseDate);
      target.setDate(target.getDate() - daysAgo);
      const targetStr = target.toISOString().slice(0, 10);
      for (const item of sorted) {
        if (item.FSRQ <= targetStr) return parseFloat(item.DWJZ);
      }
      return NaN;
    };

    const net1w = getNetAt(7);
    const net1m = getNetAt(30);
    const format = (prev: number): string => {
      if (Number.isNaN(prev) || prev <= 0) return '—';
      const pct = ((current - prev) / prev) * 100;
      return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    };

    return {
      change1w: net1w > 0 ? format(net1w) : '—',
      change1m: net1m > 0 ? format(net1m) : '—',
    };
  }

  private fallbackFundInfo(code: string): FundInfo {
    const now = new Date().toISOString().slice(0, 10);
    return {
      code,
      name: `基金${code}`,
      netValue: '—',
      riskLevel: '—',
      recentChange1d: '—',
      recentChange1w: '—',
      recentChange1m: '—',
      manager: '—',
      updatedAt: now,
    };
  }
}
