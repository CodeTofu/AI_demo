import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  List,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { GetSummaryResult, SummaryHoldingItem } from '../api/holdings';
import { deleteHolding, updateHolding } from '../api/holdings';
import { getBffDashboard, type BffDashboardResponse } from '../api/bff';
import { ChatPanel } from '../components/ChatPanel';
import { isAuthenticated } from '../utils/auth';
import { usePortfolioRealtime } from '../hooks/usePortfolioRealtime';
import './Dashboard.css';

const BFF_DASHBOARD_SWR_KEY = 'bff-dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<SummaryHoldingItem | null>(null);
  const [editCurrentValue, setEditCurrentValue] = useState('');
  const [editProfitLoss, setEditProfitLoss] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<BffDashboardResponse>(
    BFF_DASHBOARD_SWR_KEY,
    getBffDashboard,
    { revalidateOnFocus: true }
  );

  const { connected: wsConnected, lastPongMs, sendPing } = usePortfolioRealtime(mutate);

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login');
  }, [navigate]);

  const summary: GetSummaryResult | undefined = data?.portfolio;
  const totalValue = summary?.totalValue ?? 0;
  const totalProfit = summary?.totalProfit ?? 0;
  const profitRate = summary?.profitRate ?? '0%';
  const holdingCount = summary?.holdingCount ?? 0;
  const isProfit = totalProfit >= 0;

  function openEdit(h: SummaryHoldingItem) {
    setEditRow(h);
    setEditCurrentValue(String(h.currentValue));
    setEditProfitLoss(String(h.profitLoss));
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editRow) return;
    const currentValue = parseFloat(editCurrentValue);
    const profitLoss = parseFloat(editProfitLoss);
    if (!Number.isFinite(currentValue) || !Number.isFinite(profitLoss)) {
      alert('请输入有效的数字');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateHolding(editRow.id, { currentValue, profitLoss });
      setEditOpen(false);
      setEditRow(null);
      await mutate();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message
          : undefined;
      alert(
        Array.isArray(msg) ? msg.join('，') : msg || (err instanceof Error ? err.message : '更新失败'),
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(h: SummaryHoldingItem) {
    if (!window.confirm(`确定删除「${h.name}（${h.code}）」的持仓记录？`)) return;
    try {
      await deleteHolding(h.id);
      await mutate();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(msg || (err instanceof Error ? err.message : '删除失败'));
    }
  }

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
            <div className="dashboard-board-header-row">
              <div>
                <h1>资产总览</h1>
              </div>
              <div className="dashboard-ws-panel" title="Socket.IO /realtime 实时通道">
                <span
                  className={`dashboard-ws-dot ${wsConnected ? 'on' : 'off'}`}
                  aria-hidden
                />
                <span className="dashboard-ws-text">
                  {wsConnected ? '实时通道已连接' : '实时未连接'}
                </span>
                <button
                  type="button"
                  className="dashboard-ws-ping"
                  onClick={sendPing}
                  disabled={!wsConnected}
                >
                  Ping
                </button>
                {lastPongMs != null && (
                  <span className="dashboard-ws-meta">pong {lastPongMs}</span>
                )}
              </div>
            </div>
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
                          label={false}
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
                          <div className="dashboard-holding-actions">
                            <button
                              type="button"
                              className="dashboard-holding-action-btn"
                              aria-label={`编辑 ${h.name}`}
                              onClick={() => openEdit(h)}
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              className="dashboard-holding-action-btn dashboard-holding-action-btn--danger"
                              aria-label={`删除 ${h.name}`}
                              onClick={() => handleDelete(h)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
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

      {editOpen && editRow && (
        <div
          className="dashboard-edit-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-edit-title"
        >
          <div className="dashboard-edit-modal">
            <h2 id="dashboard-edit-title" className="dashboard-edit-title">
              编辑持仓
            </h2>
            <p className="dashboard-edit-sub">
              {editRow.name}（{editRow.code}）
            </p>
            <p className="dashboard-edit-hint">
              与对话记账规则一致：填写当前持仓市值（元）与持仓收益（元），系统将反推成本。
            </p>
            <label className="dashboard-edit-field">
              <span>当前持仓金额（元）</span>
              <input
                type="number"
                step="any"
                value={editCurrentValue}
                onChange={(e) => setEditCurrentValue(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="dashboard-edit-field">
              <span>持仓收益（元，可负）</span>
              <input
                type="number"
                step="any"
                value={editProfitLoss}
                onChange={(e) => setEditProfitLoss(e.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="dashboard-edit-actions">
              <button
                type="button"
                className="dashboard-edit-cancel"
                disabled={editSubmitting}
                onClick={() => {
                  setEditOpen(false);
                  setEditRow(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="dashboard-edit-save"
                disabled={editSubmitting}
                onClick={() => void submitEdit()}
              >
                {editSubmitting ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
