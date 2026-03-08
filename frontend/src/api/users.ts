import axios from 'axios'
import { getToken } from '../utils/auth'

// 定义用户类型（与后端保持一致）
export interface User {
  id: number
  name: string
  email: string
}

// 创建用户的请求参数类型
export interface CreateUserDto {
  name: string
  email: string
}

// 创建 axios 实例，配置基础 URL
const api = axios.create({
  baseURL: '/api', // 通过 Vite 代理转发到后端
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动添加 Token
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理 Token 过期等情况
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 无效或过期，清除认证信息并跳转到登录页
      import('../utils/auth').then(({ clearAuth }) => {
        clearAuth()
        window.location.href = '/login'
      })
    }
    return Promise.reject(error)
  }
)

// 获取所有用户
export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/users')
  return response.data
}

// 根据 ID 获取用户
export async function getUserById(id: number): Promise<User> {
  const response = await api.get<User>(`/users/${id}`)
  return response.data
}

// 创建新用户
export async function createUser(data: CreateUserDto): Promise<User> {
  const response = await api.post<User>('/users', data)
  return response.data
}

// 更新用户
export async function updateUser(id: number, data: Partial<CreateUserDto>): Promise<User> {
  const response = await api.patch<User>(`/users/${id}`, data)
  return response.data
}

// 删除用户
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}
