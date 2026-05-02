import axios from 'axios';
import { getToken } from '../utils/auth';

/** 与后端 GET /api/holdings/summary 返回结构一致 */
export interface SummaryHoldingItem {
  id: number;
  code: string;
  name: string;
  costTotal: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: string;
  sharePercent: number;
}

export interface GetSummaryResult {
  totalInvestment: number;
  totalValue: number;
  totalProfit: number;
  profitRate: string;
  holdingCount: number;
  holdings: SummaryHoldingItem[];
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, Promise.reject);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      import('../utils/auth').then(({ clearAuth }) => {
        clearAuth();
        window.location.href = '/login';
      });
    }
    return Promise.reject(err);
  }
);

export async function getSummary(): Promise<GetSummaryResult> {
  const { data } = await api.get<GetSummaryResult>('/holdings/summary');
  return data;
}

export interface UpdateHoldingBody {
  currentValue: number;
  profitLoss: number;
}

/** PATCH /api/holdings/:id */
export async function updateHolding(
  id: number,
  body: UpdateHoldingBody,
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.patch<{ ok: boolean; message: string }>(
    `/holdings/${id}`,
    body,
  );
  return data;
}

/** DELETE /api/holdings/:id */
export async function deleteHolding(id: number): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.delete<{ ok: boolean; message: string }>(`/holdings/${id}`);
  return data;
}
