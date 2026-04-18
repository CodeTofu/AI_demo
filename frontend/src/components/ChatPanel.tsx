import { useState, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getToken } from '../utils/auth';
import { FundDataCard } from './FundDataCard';
import { RecordHoldingSuccessCard } from './RecordHoldingSuccessCard';
import type { FundInfoData } from '../types/fund';
import type { RecordHoldingSuccessOutput } from './RecordHoldingSuccessCard';
import './ChatPanel.css';

type GetFundDetailsPart =
  | { type: 'tool-getFundDetails'; state: 'output-available'; output: FundInfoData }
  | { type: 'tool-getFundDetails'; state: 'input-streaming' | 'input-available' }
  | { type: 'tool-getFundDetails'; state: string };

function isGetFundDetailsPart(part: { type: string; state?: string; output?: unknown }): part is GetFundDetailsPart {
  return part.type === 'tool-getFundDetails';
}

function isRecordHoldingPart(
  part: { type: string; state?: string; output?: unknown }
): part is { type: 'tool-recordHolding'; state: 'output-available'; output: RecordHoldingSuccessOutput } {
  return part.type === 'tool-recordHolding' && part.state === 'output-available' && part.output != null;
}

interface ChatPanelProps {
  /** 当持仓记录成功时调用，用于看板刷新（如 SWR mutate） */
  onHoldingsChange?: () => void;
}

export function ChatPanel({ onHoldingsChange }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: () => ({
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        }),
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = String(status) === 'in_progress';

  useEffect(() => {
    if (!onHoldingsChange) return;
    for (const msg of messages) {
      const parts = msg.parts ?? [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (isRecordHoldingPart(part) && part.output?.ok) {
          const key = `${msg.id}-${i}`;
          if (!notifiedKeysRef.current.has(key)) {
            notifiedKeysRef.current.add(key);
            onHoldingsChange();
          }
        }
      }
    }
  }, [messages, onHoldingsChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ role: 'user', parts: [{ type: 'text', text: input.trim() }] });
      setInput('');
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2>AI 助手</h2>
        <p>查基金、记持仓、看盈亏</p>
      </div>
      <div className="chat-panel-messages">
        {error && (
          <div className="chat-panel-error">
            <strong>错误：</strong> {error.message || '连接失败'}
          </div>
        )}
        {messages.length === 0 && !error && (
          <div className="chat-panel-empty">
            👋 有什么想问的？例如「我的持仓」「008282 怎么样」
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-panel-message ${message.role === 'user' ? 'user' : 'ai'}`}
          >
            <div className="chat-panel-message-role">
              {message.role === 'user' ? '👤 你' : '🤖 AI'}
            </div>
            <div className="chat-panel-message-content">
              {message.parts?.length
                ? message.parts.map((part, idx) =>
                    part.type === 'text' ? (
                      <span key={idx}>{part.text}</span>
                    ) : part.type === 'reasoning' ? (
                      <span key={idx} className="reasoning">{part.text}</span>
                    ) : null
                  )
                : (message as { content?: string }).content ?? ''}
            </div>
            {message.role === 'assistant' &&
              message.parts?.map((part, index) => {
                const keyId = (part as { toolCallId?: string }).toolCallId ?? index;
                if (isGetFundDetailsPart(part)) {
                  if (part.state === 'output-available' && 'output' in part && part.output) {
                    return <FundDataCard key={`f-${keyId}`} data={part.output as FundInfoData} />;
                  }
                  if (part.state === 'input-streaming' || part.state === 'input-available') {
                    return (
                      <div key={`f-load-${keyId}`} className="fund-tool-loading">
                        <span className="fund-tool-loading-dot" /> 正在调取实时行情...
                      </div>
                    );
                  }
                }
                if (isRecordHoldingPart(part) && part.output?.ok) {
                  return <RecordHoldingSuccessCard key={`r-${keyId}`} data={part.output} />;
                }
                return null;
              })}
          </div>
        ))}
        {isLoading && (
          <div className="chat-panel-message ai">
            <div className="chat-panel-message-role">🤖 AI</div>
            <div className="chat-panel-message-content">
              <span className="typing-indicator">正在思考...</span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-panel-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={isLoading}
          className="chat-panel-input"
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '发送中' : '发送'}
        </button>
      </form>
    </div>
  );
}
