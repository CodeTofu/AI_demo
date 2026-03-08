import axios from 'axios'
import { setAuth, clearAuth, UserInfo } from '../utils/auth'

// 登录请求参数
export interface LoginDto {
  email: string
  password: string
}

// 注册请求参数
export interface RegisterDto {
  name: string
  email: string
  password: string
}

// 登录/注册响应
export interface AuthResponse {
  access_token: string
  user: UserInfo
}

// 创建独立的 axios 实例用于认证（不需要 Token）
const authApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 用户登录
 */
export async function login(loginDto: LoginDto): Promise<AuthResponse> {
  const response = await authApi.post<AuthResponse>('/auth/login', loginDto)
  // 登录成功后保存 Token 和用户信息
  setAuth(response.data.access_token, response.data.user)
  return response.data
}

/**
 * 用户注册
 */
export async function register(registerDto: RegisterDto): Promise<AuthResponse> {
  const response = await authApi.post<AuthResponse>('/auth/register', registerDto)
  // 注册成功后保存 Token 和用户信息
  setAuth(response.data.access_token, response.data.user)
  return response.data
}

/**
 * 退出登录
 */
export function logout() {
  clearAuth()
  // 可以在这里添加其他清理逻辑，比如清除状态等
}
