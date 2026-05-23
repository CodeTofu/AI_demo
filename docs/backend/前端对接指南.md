# 🎯 后端项目详解（前端工程师视角）

## 📚 用前端概念理解后端

### 核心概念对比

| 前端概念 | 后端对应 | 作用 |
|---------|---------|------|
| **组件（Component）** | **模块（Module）** | 组织代码的基本单位 |
| **页面路由（Route）** | **控制器（Controller）** | 处理 HTTP 请求，定义 API 路由 |
| **业务逻辑/工具函数** | **服务（Service）** | 处理具体业务逻辑 |
| **状态管理（useState/Redux）** | **数据库（Database）** | 持久化存储数据 |
| **API 调用（fetch/axios）** | **数据库查询（Prisma）** | 获取/保存数据 |
| **Props 传递** | **依赖注入（DI）** | 自动传递依赖 |

---

## 🏗️ 项目整体架构

```
前端（你熟悉的）                   后端（NestJS）
┌─────────────┐                  ┌─────────────┐
│  React 组件  │                  │  Controller │ ← 类似路由处理
│             │                  │  (控制器)    │
│  useState   │  ──HTTP请求──>   │             │
│  useEffect  │                  │  Service    │ ← 类似业务逻辑函数
│             │                  │  (服务)      │
│  fetch API  │                  │             │
└─────────────┘                  │  Prisma     │ ← 类似数据库操作
                                │  (数据库工具) │
                                │             │
                                │  Database   │ ← 类似 localStorage
                                │  (数据库)    │
                                └─────────────┘
```

---

## 🗄️ 数据库相关详解（重点）

### 1. 数据库是什么？

**前端类比：**
- 类似 `localStorage`，但更强大
- 数据存储在服务器上，不会丢失
- 可以存储大量数据，支持复杂查询

**实际作用：**
- 存储用户信息（姓名、邮箱、密码等）
- 数据持久化（服务重启后数据还在）
- 支持多用户同时访问

---

### 2. Prisma 是什么？

**前端类比：**
- 类似 `axios`，但用于操作数据库
- 提供类型安全的数据库操作
- 自动生成 TypeScript 类型

**实际作用：**
- 连接数据库（类似 `axios.create()`）
- 执行数据库操作（增删改查）
- 自动处理数据类型转换

---

### 3. Prisma Schema（数据库结构定义）

**文件：** `prisma/schema.prisma`

```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**前端类比：**
- 类似 TypeScript 接口定义
- 定义数据表的结构（有哪些字段）
- 类似前端的类型定义：

```typescript
// 前端类型定义
interface User {
  id: number
  name: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}
```

**作用：**
- 告诉 Prisma 数据库表的结构
- 自动生成 TypeScript 类型
- 创建数据库表（运行迁移时）

---

### 4. Prisma Service（数据库连接服务）

**文件：** `src/prisma/prisma.service.ts`

```typescript
export class PrismaService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();  // 连接数据库
    console.log('✅ 数据库连接成功');
  }
}
```

**前端类比：**
- 类似 `axios.create({ baseURL: '...' })`
- 创建一个数据库连接实例
- 应用启动时自动连接

**作用：**
- 管理数据库连接
- 提供数据库操作方法（`findMany`, `create`, `update` 等）
- 自动处理连接和断开

---

### 5. UsersService（用户业务逻辑）

**文件：** `src/users/users.service.ts`

**前端类比：**
- 类似前端的工具函数或自定义 Hook
- 封装数据库操作逻辑
- 可被多个地方复用

**关键代码解析：**

#### 获取所有用户（类似前端获取列表）

```typescript
async findAll(): Promise<UserWithoutPassword[]> {
  return this.prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      // 不返回 password（安全考虑）
    },
  });
}
```

**前端类比：**
```typescript
// 前端类似代码
async function getUsers() {
  const response = await fetch('/api/users')
  return response.json()
}
```

**区别：**
- 前端：从 API 获取数据
- 后端：从数据库获取数据

#### 根据邮箱查找用户（登录用）

```typescript
async findByEmail(email: string): Promise<User | null> {
  return this.prisma.user.findUnique({
    where: { email },
    // 返回完整信息（包括密码，用于验证）
  });
}
```

**前端类比：**
```typescript
// 前端类似代码
function findUserByEmail(users: User[], email: string) {
  return users.find(user => user.email === email)
}
```

**区别：**
- 前端：从数组查找
- 后端：从数据库查询（SQL：`SELECT * FROM users WHERE email = ?`）

#### 创建用户（注册）

```typescript
async create(createUserDto: CreateUserDto, hashedPassword: string) {
  return this.prisma.user.create({
    data: {
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
    },
  });
}
```

**前端类比：**
```typescript
// 前端类似代码
async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  })
  return response.json()
}
```

**区别：**
- 前端：发送 POST 请求
- 后端：直接写入数据库（SQL：`INSERT INTO users ...`）

---

### 6. UsersController（API 路由处理）

**文件：** `src/users/users.controller.ts`

**前端类比：**
- 类似 React Router 的路由定义
- 定义 API 端点和处理函数

**关键代码解析：**

```typescript
@Controller('users')  // 路由前缀：/api/users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()  // GET /api/users
  async findAll() {
    return this.usersService.findAll();  // 调用服务层
  }
}
```

**前端类比：**
```typescript
// 前端路由（React Router）
<Route path="/users" element={<UserList />} />

// 组件内部
function UserList() {
  const users = await getUsers()  // 调用 API
  return <div>{/* 渲染用户列表 */}</div>
}
```

**数据流程：**

```
前端请求 → Controller（路由） → Service（业务逻辑） → Prisma（数据库操作） → Database（数据库）
   ↓                                                                                    ↓
返回数据 ← Controller ← Service ← Prisma ← Database
```

---

## 🔄 完整数据流程示例

### 场景：用户注册

#### 1. 前端发送请求

```typescript
// 前端代码（你熟悉的）
const response = await fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    name: '张三',
    email: 'zhangsan@example.com',
    password: '123456'
  })
})
```

#### 2. 后端接收请求（Controller）

```typescript
// AuthController.register()
@Post('register')
async register(@Body() registerDto: RegisterDto) {
  return this.authService.register(registerDto)
}
```

**类比：** 类似前端的路由处理函数

#### 3. 业务逻辑处理（Service）

```typescript
// AuthService.register()
async register(registerDto: RegisterDto) {
  // 1. 检查邮箱是否已存在
  const existingUser = await this.usersService.findByEmail(registerDto.email)
  
  // 2. 加密密码
  const hashedPassword = await bcrypt.hash(registerDto.password, 10)
  
  // 3. 创建用户（写入数据库）
  const user = await this.usersService.create(registerDto, hashedPassword)
  
  // 4. 生成 Token
  const token = this.jwtService.sign({ sub: user.id })
  
  return { access_token: token, user }
}
```

**类比：** 类似前端的业务逻辑函数

#### 4. 数据库操作（Prisma）

```typescript
// UsersService.create()
async create(createUserDto, hashedPassword) {
  return this.prisma.user.create({
    data: {
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
    },
  })
}
```

**实际执行的 SQL：**
```sql
INSERT INTO users (name, email, password, "createdAt", "updatedAt")
VALUES ('张三', 'zhangsan@example.com', '加密后的密码', NOW(), NOW())
RETURNING id, name, email, "createdAt", "updatedAt"
```

**类比：** 
- 前端：`localStorage.setItem('user', JSON.stringify(user))`
- 后端：`prisma.user.create({ data: user })`

#### 5. 数据存储到数据库

```
PostgreSQL 数据库
┌─────────────────┐
│   users 表      │
├─────────────────┤
│ id: 1           │
│ name: "张三"    │
│ email: "..."    │
│ password: "..." │
│ createdAt: ...  │
└─────────────────┘
```

---

## 🎯 关键概念详解

### 1. 依赖注入（DI）

**前端类比：**
```typescript
// 前端：手动传递 props
function UserList({ userService }) {
  const users = userService.getUsers()
}

// 后端：自动注入（NestJS 自动处理）
constructor(private usersService: UsersService) {
  // NestJS 自动创建 UsersService 实例并注入
}
```

**好处：**
- 不需要手动 `new UsersService()`
- 自动管理依赖关系
- 方便测试（可以注入 mock 对象）

---

### 2. 异步操作（async/await）

**前端类比：**
```typescript
// 前端：获取数据
async function getUsers() {
  const response = await fetch('/api/users')
  return response.json()
}

// 后端：查询数据库
async findAll() {
  return await this.prisma.user.findMany()
}
```

**为什么需要异步？**
- 数据库操作是 I/O 操作（需要时间）
- 不阻塞其他请求
- 提高性能

---

### 3. 类型安全

**Prisma 自动生成类型：**

```typescript
// Prisma 根据 schema.prisma 自动生成
import { User } from '@prisma/client'

// 使用时完全类型安全
const user: User = {
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com',
  password: '...',
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

**类比：** 类似前端的 TypeScript 类型检查

---

## 📊 数据库操作详解

### Prisma 常用方法（类似数组方法）

| Prisma 方法 | 前端数组方法 | SQL 语句 | 说明 |
|------------|------------|---------|------|
| `findMany()` | `array.map()` | `SELECT * FROM users` | 获取多条数据 |
| `findUnique()` | `array.find()` | `SELECT * FROM users WHERE id = ?` | 查找单条数据 |
| `create()` | `array.push()` | `INSERT INTO users ...` | 创建新数据 |
| `update()` | `array[index] = ...` | `UPDATE users SET ...` | 更新数据 |
| `delete()` | `array.splice()` | `DELETE FROM users WHERE ...` | 删除数据 |

### 实际代码对比

#### 前端（内存数组）
```typescript
// 前端：从数组查找
const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' }
]

// 查找用户
const user = users.find(u => u.email === 'zhangsan@example.com')

// 添加用户
users.push({ id: 3, name: '王五', email: 'wangwu@example.com' })
```

#### 后端（数据库）
```typescript
// 后端：从数据库查询
// 查找用户
const user = await this.prisma.user.findUnique({
  where: { email: 'zhangsan@example.com' }
})

// 添加用户
await this.prisma.user.create({
  data: {
    name: '王五',
    email: 'wangwu@example.com',
    password: 'hashedPassword'
  }
})
```

**关键区别：**
- 前端：数据在内存中，刷新页面就没了
- 后端：数据在数据库中，永久保存

---

## 🔐 安全相关

### 1. 密码加密

**为什么需要加密？**

```typescript
// ❌ 不安全：明文存储
password: '123456'

// ✅ 安全：加密存储
password: '$2b$10$abcdefghijklmnopqrstuvwxyz...'
```

**类比：** 类似前端对敏感信息的处理

### 2. 不返回密码字段

```typescript
// 查询时排除密码
select: {
  id: true,
  name: true,
  email: true,
  // password: false  ← 不返回密码
}
```

**类比：** 类似前端过滤敏感数据

---

## 🎨 项目结构总结

```
backend/
├── prisma/
│   └── schema.prisma          ← 数据库结构定义（类似 TypeScript 接口）
│
├── src/
│   ├── prisma/
│   │   ├── prisma.service.ts  ← 数据库连接服务（类似 axios 实例）
│   │   └── prisma.module.ts   ← Prisma 模块（类似 Context Provider）
│   │
│   ├── users/
│   │   ├── users.controller.ts ← API 路由（类似 React Router）
│   │   ├── users.service.ts     ← 业务逻辑（类似工具函数）
│   │   └── entities/
│   │       └── user.entity.ts   ← 实体定义（已废弃，现在用 Prisma）
│   │
│   └── auth/
│       ├── auth.controller.ts   ← 登录/注册路由
│       └── auth.service.ts      ← 认证逻辑
│
└── .env                        ← 环境变量（数据库连接配置）
```

---

## 💡 核心理解

### 1. 数据流向

```
用户操作（前端）
    ↓
HTTP 请求
    ↓
Controller（路由处理）
    ↓
Service（业务逻辑）
    ↓
Prisma（数据库操作）
    ↓
PostgreSQL（数据库存储）
```

### 2. 为什么需要这么多层？

**类比前端：**
- Controller = 路由组件（处理请求）
- Service = 业务逻辑函数（处理数据）
- Prisma = 数据访问层（操作数据库）

**好处：**
- 职责分离（每个文件做一件事）
- 易于维护（修改一处不影响其他）
- 易于测试（可以单独测试每一层）

---

## 🎯 总结

### 数据库相关核心概念

1. **Prisma Schema** = 数据库表结构定义（类似 TypeScript 接口）
2. **Prisma Service** = 数据库连接工具（类似 axios）
3. **Prisma 方法** = 数据库操作（类似数组方法，但操作数据库）
4. **Service 层** = 业务逻辑（类似工具函数）
5. **Controller 层** = API 路由（类似 React Router）

### 关键区别

| 前端 | 后端 |
|------|------|
| 数据在内存（useState） | 数据在数据库（PostgreSQL） |
| 刷新页面数据丢失 | 数据永久保存 |
| 操作数组（find, push） | 操作数据库（findUnique, create） |
| 调用 API（fetch） | 提供 API（Controller） |

现在你应该对后端项目，特别是数据库部分有了清晰的理解！
