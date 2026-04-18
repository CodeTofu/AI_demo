import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 代理 API 请求到 Nest Core
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 独立 BFF（学习用）：见仓库 bff/ 目录，默认端口 4000
      '/bff': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    }
  }
})
