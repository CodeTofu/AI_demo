import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getToken, isAuthenticated } from '../utils/auth';
import { FundDataCard } from '../components/FundDataCard';
import { RecordHoldingSuccessCard } from '../components/RecordHoldingSuccessCard';
import type { FundInfoData } from '../types/fund';
import type { RecordHoldingSuccessOutput } from '../components/RecordHoldingSuccessCard';
import './Chat.css';

/** getFundDetails 工具在 message.parts 中的形态 */
type GetFundDetailsPart =
  | { type: 'tool-getFundDetails'; state: 'output-available'; output: FundInfoData }
  | { type: 'tool-getFundDetails'; state: 'input-streaming' | 'input-available' }
  | { type: 'tool-getFundDetails'; state: string };

function isGetFundDetailsPart(
  part: { type: string; state?: string; output?: unknown },
): part is GetFundDetailsPart {
  return part.type === 'tool-getFundDetails';
}

/** recordHolding 工具成功返回时展示 */
function isRecordHoldingPart(
  part: { type: string; state?: string; output?: unknown },
): part is { type: 'tool-recordHolding'; state: 'output-available'; output: RecordHoldingSuccessOutput } {
  return part.type === 'tool-recordHolding' && part.state === 'output-available' && part.output != null;
}

/**
 * 聊天页面组件
 * 使用 Vercel AI SDK 的 useChat Hook
 */
export default function Chat() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  
  // 检查是否已登录
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);
  
  // 使用自定义 Transport，在每次请求时解析 token，确保携带 Authorization
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: () => {
          const token = getToken();
          return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = String(status) === 'in_progress';

  // 如果有错误，显示错误信息
  if (error) {
    console.error('Chat error:', error);
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: input.trim() }],
      });
      setInput('');
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
      <div className="chat-header">
        <h1>AI 聊天助手</h1>
        <p>与 AI 进行对话，支持流式响应（打字机效果）</p>
      </div>

      <div className="chat-messages">
        {error && (
          <div className="error-message" style={{ 
            padding: '16px', 
            background: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <strong>错误：</strong> {error.message || '连接失败，请检查后端服务是否运行'}
          </div>
        )}
        
        {messages.length === 0 && !error && (
          <div className="empty-state">
            <p>👋 你好！我是 AI 助手，有什么可以帮助你的吗？</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
          >
            <div className="message-role">
              {message.role === 'user' ? '👤 你' : '🤖 AI'}
            </div>
            <div className="message-content">
              {message.parts?.length
                ? message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <span key={index}>{part.text}</span>
                    ) : part.type === 'reasoning' ? (
                      <span key={index} className="reasoning">{part.text}</span>
                    ) : null
                  )
                : (message as { content?: string }).content ?? ''}
            </div>
            {/* Generative UI：getFundDetails → 基金卡片；recordHolding 成功 → 成功反馈卡片 */}
            {message.role === 'assistant' &&
              message.parts?.map((part, index) => {
                const keyId = (part as { toolCallId?: string }).toolCallId ?? index;
                if (isGetFundDetailsPart(part)) {
                  if (part.state === 'output-available' && 'output' in part && part.output) {
                    return (
                      <FundDataCard
                        key={`fund-${keyId}`}
                        data={part.output as FundInfoData}
                      />
                    );
                  }
                  if (part.state === 'input-streaming' || part.state === 'input-available') {
                    return (
                      <div key={`fund-loading-${keyId}`} className="fund-tool-loading">
                        <span className="fund-tool-loading-dot" />
                        正在调取实时行情数据...
                      </div>
                    );
                  }
                }
                if (isRecordHoldingPart(part) && part.output?.ok) {
                  return (
                    <RecordHoldingSuccessCard
                      key={`record-${keyId}`}
                      data={part.output}
                    />
                  );
                }
                return null;
              })}
          </div>
        ))}

        {isLoading && (
          <div className="message ai-message">
            <div className="message-role">🤖 AI</div>
            <div className="message-content">
              <span className="typing-indicator">正在思考...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input || ''}
          onChange={handleInputChange}
          placeholder="输入你的消息..."
          disabled={isLoading}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading || !input?.trim()}>
          {isLoading ? '发送中...' : '发送'}
        </button>
      </form>
      </div>
    </div>
  );
}
