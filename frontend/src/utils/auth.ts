/**
 * Token 管理工具
 * 用于存储和获取 JWT Token
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'

export interface UserInfo {
  id: number
  name: string
  email: string
}

/**
 * 保存 Token 和用户信息
 */
export function setAuth(token: string, user: UserInfo) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 获取 Token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 获取用户信息
 */
export function getUser(): UserInfo | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * 清除认证信息（退出登录）
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}

/**
 * 退出登录（清除认证信息）
 */
export function logout() {
  clearAuth()
}
