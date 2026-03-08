import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, TrendingUp } from 'lucide-react';
import type { FundInfoData } from '../types/fund';
import './FundDataCard.css';

/** 判断日涨跌是否为正（支持 +1.2% / -0.5% 格式） */
function isPositiveChange(recentChange1d: string): boolean {
  if (!recentChange1d || recentChange1d === '—') return false;
  const num = parseFloat(recentChange1d.replace(/[+%\s]/g, ''));
  return !Number.isNaN(num) && num >= 0;
}

/** 国内习惯：涨红跌绿 */
const CHART_COLOR_UP = '#ef4444';
const CHART_COLOR_DOWN = '#22c55e';

interface FundDataCardProps {
  data: FundInfoData;
}

/**
 * 基金数据卡片（Generative UI）
 * 展示基金名称、代码、风险等级、净值、日涨跌幅及近 7 日收益曲线
 */
export function FundDataCard({ data }: FundDataCardProps) {
  const isUp = isPositiveChange(data.recentChange1d);
  const chartColor = isUp ? CHART_COLOR_UP : CHART_COLOR_DOWN;

  return (
    <div className="fund-data-card">
      <div className="fund-data-card-header">
        <div className="fund-data-card-header-row">
          <div className="fund-data-card-header-main">
            <h3 className="fund-data-card-title">{data.name}</h3>
            <div className="fund-data-card-meta">
              <span className="fund-data-card-code">{data.code}</span>
              {data.riskLevel !== '—' && (
                <span className="fund-data-card-badge" title="风险等级">
                  <Info className="fund-data-card-badge-icon" aria-hidden />
                  {data.riskLevel}
                </span>
              )}
            </div>
          </div>
          <div
            className={`fund-data-card-change ${isUp ? 'up' : 'down'}`}
          >
            <TrendingUp aria-hidden />
            <span>{data.recentChange1d}</span>
          </div>
        </div>
      </div>

      <div className="fund-data-card-net">
        <span className="fund-data-card-net-label">单位净值</span>
        <span className="fund-data-card-net-value">{data.netValue}</span>
      </div>

      {data.chartData && data.chartData.length > 0 && (
        <div className="fund-data-card-chart-wrap">
          <p className="fund-data-card-chart-title">近 7 日收益率</p>
          <div className="fund-data-card-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.chartData}
                margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="areaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) =>
                    value != null ? [`${Number(value)}%`, '收益率'] : ['—', '收益率']
                  }
                  labelFormatter={(label) => `日期 ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="fund-data-card-footer">
        数据仅供参考，以基金公司披露为准
      </div>
    </div>
  );
}
