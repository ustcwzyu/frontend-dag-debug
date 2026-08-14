import { defineConfig } from 'vite'

// 本地开发：/api 前缀请求代理到 Express 后端（npm run server，默认 http://localhost:3001）
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
