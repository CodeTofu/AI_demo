import { useState, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  convertFileListToFileUIParts,
  isFileUIPart,
  type FileUIPart,
} from 'ai';
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

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function ChatPanel({ onHoldingsChange }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [hasPendingImage, setHasPendingImage] = useState(false);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 与预览 state 同步，避免 onChange 连续触发时错误 revoke */
  const pendingPreviewRef = useRef<string | null>(null);
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current);
      }
    };
  }, []);

  const applyFileInputSelection = (el: HTMLInputElement | null) => {
    if (pendingPreviewRef.current) {
      URL.revokeObjectURL(pendingPreviewRef.current);
      pendingPreviewRef.current = null;
    }
    const file = el?.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      pendingPreviewRef.current = url;
      setHasPendingImage(true);
      setPendingFileName(file.name);
      setPendingPreviewUrl(url);
    } else {
      setHasPendingImage(false);
      setPendingFileName(null);
      setPendingPreviewUrl(null);
    }
  };

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

  const clearPendingFile = () => {
    if (pendingPreviewRef.current) {
      URL.revokeObjectURL(pendingPreviewRef.current);
      pendingPreviewRef.current = null;
    }
    setHasPendingImage(false);
    setPendingFileName(null);
    setPendingPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const text = input.trim();
    const files = fileInputRef.current?.files;
    if (!text && (!files || files.length === 0)) return;

    if (files?.length && files[0].size > MAX_IMAGE_BYTES) {
      alert(`图片请小于 ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
      return;
    }

    const parts: Array<{ type: 'text'; text: string } | FileUIPart> = [];
    if (text) {
      parts.push({ type: 'text', text });
    }
    try {
      if (files?.length) {
        const fileParts = await convertFileListToFileUIParts(files);
        parts.push(...fileParts);
      }
    } catch (err) {
      console.error('[ChatPanel] convertFileListToFileUIParts', err);
      alert(err instanceof Error ? err.message : '处理图片失败，请换一张图重试');
      return;
    }
    if (!text && files?.length) {
      parts.unshift({
        type: 'text',
        text: '请根据图片回答：简要说明图中可见的关键信息；若与基金、持仓相关请一并指出。',
      });
    }

    try {
      sendMessage({ role: 'user', parts });
    } catch (err) {
      console.error('[ChatPanel] sendMessage', err);
      alert(err instanceof Error ? err.message : '发送失败');
      return;
    }
    setInput('');
    clearPendingFile();
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
                    ) : isFileUIPart(part) && part.mediaType.startsWith('image/') ? (
                      <img
                        key={idx}
                        src={part.url}
                        alt={part.filename ?? '上传的图片'}
                        className="chat-panel-message-image"
                      />
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
        <label className="chat-panel-image-picker">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="chat-panel-file-native"
            aria-label="选择一张图片"
            disabled={isLoading}
            onChange={(e) => applyFileInputSelection(e.target as HTMLInputElement)}
          />
          <span className="chat-panel-image-picker-label">图片</span>
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={isLoading}
          className="chat-panel-input"
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !hasPendingImage)}
        >
          {isLoading ? '发送中' : '发送'}
        </button>
      </form>
      {(pendingFileName || pendingPreviewUrl) && (
        <div className="chat-panel-pending-file">
          {pendingPreviewUrl && (
            <img src={pendingPreviewUrl} alt="" className="chat-panel-pending-thumb" />
          )}
          <span className="chat-panel-pending-name">
            {pendingFileName ? `已选：${pendingFileName}` : '已选择图片'}
          </span>
          <button
            type="button"
            className="chat-panel-pending-clear"
            onClick={clearPendingFile}
            disabled={isLoading}
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
}
