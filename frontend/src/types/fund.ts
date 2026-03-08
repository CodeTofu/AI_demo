/**
 * 与后端 getFundDetails 工具返回结构一致，用于 Generative UI 展示
 */
export interface FundChartDataPoint {
  date: string;
  value: number;
}

export interface FundInfoData {
  code: string;
  name: string;
  netValue: string;
  riskLevel: string;
  recentChange1d: string;
  recentChange1w: string;
  recentChange1m: string;
  manager: string;
  updatedAt: string;
  chartData: FundChartDataPoint[];
}
