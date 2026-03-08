# 前端项目 - React + TypeScript

这是一个使用 React 18 和 TypeScript 构建的前端项目，通过 Vite 构建工具提供快速的开发体验。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

应用将在 `http://localhost:3000` 运行

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/           # API 调用封装
│   │   └── users.ts     # 用户相关 API
│   ├── App.tsx          # 主应用组件
│   ├── App.css          # 样式文件
│   ├── main.tsx         # 应用入口
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 🔧 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Axios** - HTTP 客户端

## 📡 API 调用

所有 API 调用都封装在 `src/api/users.ts` 中：

```typescript
import { getUsers, createUser } from './api/users'

// 获取用户列表
const users = await getUsers()

// 创建用户
const newUser = await createUser({ name: '张三', email: 'zhangsan@example.com' })
```

## ⚙️ 配置说明

### Vite 代理配置

在 `vite.config.ts` 中配置了代理，将 `/api` 请求转发到后端：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  }
}
```

这意味着前端调用 `/api/users` 时，实际请求会被转发到 `http://localhost:3001/api/users`

## 🎨 功能特性

- ✅ 用户列表展示
- ✅ 创建新用户
- ✅ 响应式设计
- ✅ TypeScript 类型安全
- ✅ 现代化的 UI 设计

## 📝 开发建议

1. **类型定义**：在 `src/api/users.ts` 中定义了与后端一致的类型
2. **错误处理**：在实际项目中应该添加更完善的错误处理
3. **状态管理**：对于复杂应用，可以考虑使用 Redux 或 Zustand
4. **路由**：需要多页面时，可以集成 React Router
