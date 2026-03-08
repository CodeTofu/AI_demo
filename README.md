# Node.js + NestJS 学习项目

这是一个用于学习 Node.js 和 NestJS 的示例项目，包含前端和后端两个独立的项目。

**📚 说明文档**：所有说明类 `.md` 已统一放在 [docs/](./docs/) 目录，与代码分离。详见 [docs/README.md](./docs/README.md)。

## 📁 项目结构

```
.
├── frontend/          # React + TypeScript 前端项目
│   ├── src/
│   │   ├── api/      # API 调用封装
│   │   ├── App.tsx   # 主组件
│   │   └── main.tsx  # 入口文件
│   └── package.json
│
└── backend/           # NestJS + TypeScript 后端项目
    ├── src/
    │   ├── users/    # 用户模块（示例）
    │   ├── app.module.ts
    │   └── main.ts   # 入口文件
    └── package.json
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn 或 pnpm

### 1. 安装依赖

#### 前端项目
```bash
cd frontend
npm install
```

#### 后端项目
```bash
cd backend
npm install
```

### 2. 启动项目

#### 启动后端（端口 3001）
```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:3001` 运行，API 地址为 `http://localhost:3001/api`

#### 启动前端（端口 3000）
```bash
cd frontend
npm run dev
```

前端应用将在 `http://localhost:3000` 运行

### 3. 访问应用

打开浏览器访问：`http://localhost:3000`

### 4. 使用登录功能

1. **注册新账户**：
   - 访问 `http://localhost:3000/register`
   - 填写姓名、邮箱和密码（至少6位）
   - 点击注册

2. **登录**：
   - 访问 `http://localhost:3000/login`
   - 输入注册时的邮箱和密码
   - 点击登录

3. **访问主页**：
   - 登录成功后自动跳转到主页
   - 主页显示用户列表和创建用户功能
   - 所有 API 请求会自动携带 Token

4. **退出登录**：
   - 点击右上角的"退出登录"按钮

## 📚 学习要点

### 前端项目（React + TypeScript）

- **技术栈**：React 18 + TypeScript + Vite + React Router
- **API 调用**：使用 axios 封装 API 请求
- **代理配置**：Vite 代理 `/api` 请求到后端
- **路由保护**：使用 ProtectedRoute 组件保护需要认证的页面
- **Token 管理**：自动在请求头中添加 JWT Token

### 后端项目（NestJS + TypeScript）

- **核心概念**：
  - **模块（Module）**：组织代码的基本单位
  - **控制器（Controller）**：处理 HTTP 请求
  - **服务（Service）**：包含业务逻辑
  - **DTO（Data Transfer Object）**：定义数据传输格式和验证规则
  - **依赖注入（DI）**：自动管理依赖关系
  - **守卫（Guard）**：保护需要认证的接口
  - **策略（Strategy）**：JWT 验证策略

- **API 接口**：
  - **认证接口**：
    - `POST /api/auth/register` - 用户注册
    - `POST /api/auth/login` - 用户登录
  - **用户接口**（需要认证）：
    - `GET /api/users` - 获取所有用户
    - `GET /api/users/:id` - 获取单个用户
    - `POST /api/users` - 创建用户
    - `PATCH /api/users/:id` - 更新用户
    - `DELETE /api/users/:id` - 删除用户

## 🔍 代码说明

### 前后端协作流程

1. **前端发送请求** → `frontend/src/api/users.ts`
2. **Vite 代理转发** → `frontend/vite.config.ts` 中的 proxy 配置
3. **后端接收请求** → `backend/src/users/users.controller.ts`
4. **业务逻辑处理** → `backend/src/users/users.service.ts`
5. **返回响应数据** → 前端接收并更新 UI

### 类型定义

前后端使用相同的类型定义（`User` 接口），确保类型安全：

- 前端：`frontend/src/api/users.ts`
- 后端：`backend/src/users/entities/user.entity.ts`

## 📖 学习资源

- [Node.js 官方文档](https://nodejs.org/docs)
- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

## 🛠️ 常用命令

### 前端
```bash
npm run dev      # 开发模式
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

### 后端
```bash
npm run dev      # 开发模式（热重载）
npm run build    # 构建项目
npm run start    # 启动生产版本
npm run lint     # 代码检查
```

## 🔐 登录功能说明

### 功能特性

- ✅ 用户注册（密码加密存储）
- ✅ 用户登录（JWT Token 认证）
- ✅ 路由保护（未登录自动跳转）
- ✅ Token 自动管理（请求拦截器）
- ✅ 退出登录功能

### 安全特性

- **密码加密**：使用 bcrypt 加密存储密码
- **JWT Token**：使用 JWT 进行身份验证
- **Token 过期**：Token 有效期为 7 天
- **自动刷新**：Token 过期后自动跳转登录页

### 技术实现

**后端**：
- 使用 `@nestjs/jwt` 生成和验证 JWT
- 使用 `bcrypt` 加密密码
- 使用 `@UseGuards(JwtAuthGuard)` 保护接口

**前端**：
- 使用 `localStorage` 存储 Token
- 使用 axios 拦截器自动添加 Token
- 使用 React Router 实现路由保护

## 💡 下一步学习建议

1. **数据库集成**：学习使用 TypeORM 或 Prisma 连接数据库
2. **权限控制**：实现基于角色的访问控制（RBAC）
3. **Token 刷新**：实现 Token 自动刷新机制
4. **错误处理**：学习异常过滤器和全局错误处理
5. **测试**：编写单元测试和 E2E 测试
6. **部署**：学习如何部署前后端项目

## 📝 注意事项

- 后端使用内存数组模拟数据库，重启服务后数据会丢失
- 实际项目中应该使用真实的数据库（PostgreSQL、MySQL、MongoDB 等）
- 生产环境需要配置环境变量和安全性设置
