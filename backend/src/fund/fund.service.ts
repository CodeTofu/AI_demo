import { Injectable } from '@nestjs/common';

/**
 * 基金信息（模拟从数据库或 API 获取）
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

/**
 * 基金服务：提供基金数据（当前为模拟，可替换为真实数据库/API）
 */
@Injectable()
export class FundService {
  private readonly mockDb: Record<string, Omit<FundInfo, 'code' | 'updatedAt'>> = {
    '000001': {
      name: '华夏成长混合',
      netValue: '1.2345',
      riskLevel: '中高风险',
      recentChange1d: '+0.52%',
      recentChange1w: '+2.35%',
      recentChange1m: '+5.12%',
      manager: '张经理',
    },
    '110011': {
      name: '易方达中小盘混合',
      netValue: '2.8765',
      riskLevel: '中风险',
      recentChange1d: '-0.12%',
      recentChange1w: '+0.88%',
      recentChange1m: '+1.23%',
      manager: '李经理',
    },
    '161725': {
      name: '招商中证白酒',
      netValue: '0.9876',
      riskLevel: '高风险',
      recentChange1d: '+1.88%',
      recentChange1w: '+4.20%',
      recentChange1m: '+8.56%',
      manager: '王经理',
    },
  };

  /**
   * 根据基金代码获取基金信息（模拟）
   */
  getFundInfo(code: string): FundInfo {
    const base = this.mockDb[code];
    const now = new Date().toISOString().slice(0, 10);
    if (base) {
      return { ...base, code, updatedAt: now };
    }
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
