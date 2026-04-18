import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  List,
  ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { GetSummaryResult } from '../api/holdings';
import { getBffDashboard, type BffDashboardResponse } from '../api/bff';
import { ChatPanel } from '../components/ChatPanel';
import { isAuthenticated } from '../utils/auth';
import './Dashboard.css';

const BFF_DASHBOARD_SWR_KEY = 'bff-dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<BffDashboardResponse>(
    BFF_DASHBOARD_SWR_KEY,
    getBffDashboard,
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login');
  }, [navigate]);

  const summary: GetSummaryResult | undefined = data?.portfolio;
  const totalValue = summary?.totalValue ?? 0;
  const totalProfit = summary?.totalProfit ?? 0;
  const profitRate = summary?.profitRate ?? '0%';
  const holdingCount = summary?.holdingCount ?? 0;
  const isProfit = totalProfit >= 0;

  const pieData =
    summary?.holdings.map((h, i) => ({
      name: h.name.length > 6 ? h.name.slice(0, 6) + '…' : h.name,
      value: h.currentValue,
      code: h.code,
      fill: [
        '#667eea',
        '#764ba2',
        '#f59e0b',
        '#10b981',
        '#ef4444',
        '#3b82f6',
        '#ec4899',
      ][i % 7],
    })) ?? [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <aside className="dashboard-board">
          <header className="dashboard-board-header">
            <h1>资产总览</h1>
            <p>
              {data?.user?.name != null
                ? `${data.user.name} · `
                : ''}
              实时净值 · 盈亏一目了然
            </p>
          </header>

          {error && (
            <div className="dashboard-error">
              加载失败。请确认 BFF 已启动（<code>bff</code> 目录 <code>npm run dev</code>
              ，端口 4000）且后端 3001 可用，稍后重试。
            </div>
          )}

          {isLoading && !summary && (
            <div className="dashboard-loading">加载中…</div>
          )}

          {summary && (
            <>
              <div className="dashboard-stats">
                <div className="dashboard-stat-card">
                  <Wallet className="dashboard-stat-icon" />
                  <div>
                    <span className="dashboard-stat-label">总市值</span>
                    <span className="dashboard-stat-value">
                      ¥{totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div
                  className={`dashboard-stat-card dashboard-stat-card--profit ${isProfit ? 'up' : 'down'}`}
                >
                  {isProfit ? (
                    <TrendingUp className="dashboard-stat-icon" />
                  ) : (
                    <TrendingDown className="dashboard-stat-icon" />
                  )}
                  <div>
                    <span className="dashboard-stat-label">总盈亏</span>
                    <span className="dashboard-stat-value">
                      {isProfit ? '+' : ''}¥{totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      <small> ({profitRate})</small>
                    </span>
                  </div>
                </div>
                <div className="dashboard-stat-card">
                  <List className="dashboard-stat-icon" />
                  <div>
                    <span className="dashboard-stat-label">持仓基金</span>
                    <span className="dashboard-stat-value">{holdingCount} 只</span>
                  </div>
                </div>
              </div>

              {pieData.length > 0 && (
                <div className="dashboard-pie-wrap">
                  <h3 className="dashboard-pie-title">
                    <PieChartIcon size={18} />
                    资产占比
                  </h3>
                  <div className="dashboard-pie-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) =>
                            `¥${Number(value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                          }
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="dashboard-holdings-wrap">
                <h3 className="dashboard-holdings-title">持仓列表</h3>
                {summary.holdings.length === 0 ? (
                  <p className="dashboard-holdings-empty">暂无持仓，在右侧对话中可添加</p>
                ) : (
                  <ul className="dashboard-holdings-list">
                    {summary.holdings.map((h) => (
                      <li key={h.id} className="dashboard-holding-card">
                        <div className="dashboard-holding-card-header">
                          <span className="dashboard-holding-name-wrap">
                            <span className="dashboard-holding-name">{h.name}</span>
                            <span className="dashboard-holding-code">（{h.code}）</span>
                          </span>
                          <ChevronRight className="dashboard-holding-chevron" />
                        </div>
                        <div className="dashboard-holding-metrics">
                          <div className="dashboard-holding-metric">
                            <span className="dashboard-holding-metric-label">金额</span>
                            <span className="dashboard-holding-metric-value">
                              {h.currentValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="dashboard-holding-metric">
                            <span className="dashboard-holding-metric-label">成本</span>
                            <span className="dashboard-holding-metric-value">
                              {h.costTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="dashboard-holding-metric">
                            <span className="dashboard-holding-metric-label">持仓收益/率</span>
                            <span
                              className={`dashboard-holding-metric-value dashboard-holding-profit ${
                                h.profitLoss >= 0 ? 'up' : 'down'
                              }`}
                            >
                              {h.profitLoss >= 0 ? '+' : ''}
                              {h.profitLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                            <span
                              className={`dashboard-holding-rate ${h.profitLoss >= 0 ? 'up' : 'down'}`}
                            >
                              {h.profitLossPercent}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>

        <section className="dashboard-chat">
          <ChatPanel onHoldingsChange={mutate} />
        </section>
      </div>
    </div>
  );
}
