import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register, RegisterDto } from '../api/auth'
import './Register.css'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterDto>({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码长度
    if (formData.password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    try {
      await register(formData)
      // 注册成功，跳转到主页
      navigate('/')
    } catch (err: any) {
      // 显示错误信息
      setError(err.response?.data?.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>注册</h1>
        <p className="subtitle">创建新账户，开始使用</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入姓名"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="请输入邮箱"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="请输入密码（至少6位）"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="login-link">
          已有账户？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
