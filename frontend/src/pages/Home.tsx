import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUsers, createUser, User } from '../api/users'
import { getUser, logout } from '../utils/auth'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const currentUser = getUser()

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error: any) {
      console.error('获取用户失败:', error)
      if (error.response?.status === 401) {
        // Token 无效，已由拦截器处理
        return
      }
      alert('获取用户失败')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取用户列表
  useEffect(() => {
    fetchUsers()
  }, [])

  // 创建新用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      alert('请填写完整信息')
      return
    }

    try {
      const newUser = await createUser({ name, email })
      setUsers([...users, newUser])
      setName('')
      setEmail('')
      alert('用户创建成功！')
    } catch (error) {
      console.error('创建用户失败:', error)
      alert('创建用户失败')
    }
  }

  // 退出登录
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>React + TypeScript 前端项目</h1>
          <p>与 NestJS 后端协作示例</p>
        </div>
        <div className="user-info">
          <span>欢迎，{currentUser?.name}</span>
          <div className="header-actions">
            <Link to="/chat" className="chat-link">
              💬 AI 聊天
            </Link>
            <button onClick={handleLogout} className="logout-button">
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        {/* 创建用户表单 */}
        <section className="form-section">
          <h2>创建新用户</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="name">姓名：</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">邮箱：</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
            <button type="submit">创建用户</button>
          </form>
        </section>

        {/* 用户列表 */}
        <section className="list-section">
          <div className="section-header">
            <h2>用户列表</h2>
            <button onClick={fetchUsers} disabled={loading}>
              {loading ? '加载中...' : '刷新'}
            </button>
          </div>

          {loading && users.length === 0 ? (
            <p>加载中...</p>
          ) : users.length === 0 ? (
            <p>暂无用户数据</p>
          ) : (
            <ul className="user-list">
              {users.map((user) => (
                <li key={user.id} className="user-item">
                  <div className="user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span className="user-id">ID: {user.id}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default Home
