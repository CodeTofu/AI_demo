import { CheckCircle } from 'lucide-react';

export interface RecordHoldingSuccessOutput {
  ok: boolean;
  message: string;
  holding?: {
    id: number;
    code: string;
    name: string;
    /** 当前持仓（市值） */
    currentValue: number;
    /** 持仓收益 */
    profitLoss: number;
    /** 持仓收益率 */
    profitLossPercent: string;
  };
}

interface RecordHoldingSuccessCardProps {
  data: RecordHoldingSuccessOutput;
}

/**
 * 记录持仓成功后的简洁反馈卡片（只展示当前持仓、持仓收益、持仓收益率）
 */
export function RecordHoldingSuccessCard({ data }: RecordHoldingSuccessCardProps) {
  if (!data?.ok) return null;

  return (
    <div className="record-holding-success-card">
      <CheckCircle className="record-holding-success-icon" aria-hidden />
      <div className="record-holding-success-body">
        <p className="record-holding-success-title">持仓已记录</p>
        <p className="record-holding-success-message">{data.message}</p>
        {data.holding && (
          <div className="record-holding-success-detail">
            <span>{data.holding.name}（{data.holding.code}）</span>
            <span>当前持仓 ¥{data.holding.currentValue.toFixed(2)}</span>
            <span>
              持仓收益 {data.holding.profitLoss >= 0 ? '+' : ''}¥{data.holding.profitLoss.toFixed(2)}
            </span>
            <span>收益率 {data.holding.profitLossPercent}</span>
          </div>
        )}
      </div>
    </div>
  );
}
