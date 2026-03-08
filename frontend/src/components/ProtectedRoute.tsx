import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

/**
 * 受保护的路由组件
 * 如果用户未登录，重定向到登录页
 */
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
