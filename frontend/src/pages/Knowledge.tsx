import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadKnowledgePdf, IngestKnowledgeResult } from '../api/knowledge';
import { getUser, logout } from '../utils/auth';
import './Knowledge.css';

function Knowledge() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getUser();

  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IngestKnowledgeResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError('');
    setResult(null);
    if (file && !title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('请选择 PDF 文件');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await uploadKnowledgePdf(selectedFile, title || undefined);
      setResult(data);
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setError(
        Array.isArray(message) ? message.join('；') : message || '上传失败，请稍后重试',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="knowledge-container">
      <header className="knowledge-header">
        <div className="header-content">
          <h1>知识库管理</h1>
          <p>上传 PDF，自动分片并向量化入库</p>
        </div>
        <div className="user-info">
          <span>欢迎，{currentUser?.name}</span>
          <div className="header-actions">
            <Link to="/" className="nav-link">
              看板
            </Link>
            <Link to="/chat" className="nav-link">
              AI 聊天
            </Link>
            <button type="button" onClick={handleLogout} className="logout-button">
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="knowledge-main">
        <section className="upload-section">
          <h2>上传 PDF</h2>
          <p className="section-hint">
            文件经 LangChain 解析分片后写入 pgvector，聊天时会自动检索相关内容。
          </p>

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <label htmlFor="knowledge-title">文档标题</label>
              <input
                id="knowledge-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="可选，默认使用文件名"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="knowledge-file">PDF 文件</label>
              <input
                id="knowledge-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                disabled={loading}
              />
              {selectedFile && (
                <p className="file-meta">
                  已选：{selectedFile.name}（{(selectedFile.size / 1024).toFixed(1)} KB）
                </p>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="submit-button" disabled={loading || !selectedFile}>
              {loading ? '处理中…' : '上传并向量化'}
            </button>
          </form>

          {result && (
            <div className="result-card">
              <h3>入库成功</h3>
              <ul>
                <li>
                  <strong>文档 ID：</strong>
                  {result.documentId}
                </li>
                <li>
                  <strong>标题：</strong>
                  {result.title}
                </li>
                <li>
                  <strong>来源：</strong>
                  {result.source}
                </li>
                <li>
                  <strong>分片数：</strong>
                  {result.chunkCount}
                </li>
              </ul>
              <p className="result-hint">可在 AI 聊天中提问文档相关内容进行验证。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Knowledge;
