import axios from 'axios';
import { getToken } from '../utils/auth';

export interface IngestKnowledgeResult {
  documentId: number;
  title: string;
  source: string;
  chunkCount: number;
}

const api = axios.create({
  baseURL: '/api',
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
  },
);

/** POST /api/knowledge/upload — multipart PDF 入库 */
export async function uploadKnowledgePdf(
  file: File,
  title?: string,
): Promise<IngestKnowledgeResult> {
  const form = new FormData();
  form.append('file', file);
  if (title?.trim()) {
    form.append('title', title.trim());
  }

  const { data } = await api.post<IngestKnowledgeResult>('/knowledge/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
