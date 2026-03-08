import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, LoginDto } from '../api/auth'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData)
      // 登录成功，跳转到主页
      navigate('/')
    } catch (err: any) {
      // 显示错误信息
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>登录</h1>
        <p className="subtitle">欢迎回来！请登录您的账户</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
              placeholder="请输入密码"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="register-link">
          还没有账户？<Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
