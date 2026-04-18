import axios from 'axios'
import { getToken } from '../utils/auth'
import type { GetSummaryResult } from './holdings'

/** BFF GET /bff/v1/dashboard 返回结构 */
export interface BffDashboardResponse {
  generatedAt: string
  user: { id: number; name: string; email: string; createdAt?: string; updatedAt?: string }
  portfolio: GetSummaryResult
}

/** 使用完整路径，避免 baseURL + path 拼接成 `/bff/bff/...` */
const bff = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

bff.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

bff.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      import('../utils/auth').then(({ clearAuth }) => {
        clearAuth()
        window.location.href = '/login'
      })
    }
    return Promise.reject(err)
  },
)

/** 聚合示例：用户信息 + 持仓汇总（需先启动 BFF：bff 目录 npm run dev） */
export async function getBffDashboard(): Promise<BffDashboardResponse> {
  const { data } = await bff.get<BffDashboardResponse>('/bff/v1/dashboard')
  return data
}
