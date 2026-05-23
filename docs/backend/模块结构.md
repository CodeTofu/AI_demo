# 📁 NestJS 模块化架构详解

## 🎯 核心发现：模块结构模式

你观察得很对！`auth` 和 `users` 文件夹的结构确实很相似，这是 **NestJS 的模块化架构模式**。

---

## 📊 结构对比

### Users 模块结构

```
users/
├── users.module.ts        ← 模块定义（组织者）
├── users.controller.ts    ← 控制器（API 路由）
├── users.service.ts       ← 服务（业务逻辑）
├── dto/                   ← 数据传输对象（请求验证）
│   ├── create-user.dto.ts
│   └── create-user-admin.dto.ts
├── entities/              ← 实体（数据结构，现在用 Prisma）
│   └── user.entity.ts
└── types/                 ← 类型定义
    └── user.types.ts
```

### Auth 模块结构

```
auth/
├── auth.module.ts         ← 模块定义（组织者）
├── auth.controller.ts     ← 控制器（API 路由）
├── auth.service.ts        ← 服务（业务逻辑）
├── dto/                   ← 数据传输对象（请求验证）
│   ├── login.dto.ts
│   └── register.dto.ts
├── jwt.strategy.ts        ← JWT 验证策略
└── jwt-auth.guard.ts      ← JWT 认证守卫
```

---

## 🔍 共同结构模式

### 标准模块结构（NestJS 约定）

每个功能模块通常包含：

```
模块名/
├── 模块名.module.ts       ← 必需：模块定义
├── 模块名.controller.ts   ← 必需：API 路由
├── 模块名.service.ts      ← 必需：业务逻辑
├── dto/                   ← 可选：请求验证
├── entities/              ← 可选：数据实体
├── types/                 ← 可选：类型定义
└── 其他工具文件            ← 可选：特定功能
```

---

## 💡 为什么这样组织？

### 前端类比

**前端项目结构：**
```
components/
├── UserList/
│   ├── UserList.tsx       ← 组件（类似 Controller）
│   ├── UserList.css       ← 样式
│   ├── useUserList.ts     ← Hook（类似 Service）
│   └── types.ts           ← 类型定义
└── Login/
    ├── Login.tsx
    ├── Login.css
    ├── useLogin.ts
    └── types.ts
```

**后端项目结构：**
```
src/
├── users/
│   ├── users.controller.ts  ← API 路由（类似组件）
│   ├── users.service.ts     ← 业务逻辑（类似 Hook）
│   └── dto/                  ← 类型定义
└── auth/
    ├── auth.controller.ts
    ├── auth.service.ts
    └── dto/
```

**共同点：**
- 按功能组织代码
- 每个功能一个文件夹
- 相关文件放在一起

---

## 📝 各文件的作用

### 1. `xxx.module.ts` - 模块定义

**作用：** 组织者，把所有相关文件组织在一起

**前端类比：**
```typescript
// 前端：组件导出
export { UserList } from './UserList'
export { useUserList } from './useUserList'

// 后端：模块注册
@Module({
  controllers: [UsersController],  // 注册控制器
  providers: [UsersService],      // 注册服务
  exports: [UsersService],        // 导出供其他模块使用
})
```

**关键代码：**
```typescript
@Module({
  controllers: [UsersController],  // 👈 注册哪些控制器
  providers: [UsersService],       // 👈 注册哪些服务
  exports: [UsersService],        // 👈 导出哪些服务（供其他模块使用）
})
export class UsersModule {}
```

---

### 2. `xxx.controller.ts` - API 路由

**作用：** 定义 API 接口，处理 HTTP 请求

**前端类比：**
```typescript
// 前端：路由定义
<Route path="/users" element={<UserList />} />

// 后端：API 路由
@Controller('users')  // 路由前缀：/api/users
export class UsersController {
  @Get()  // GET /api/users
  async findAll() { ... }
}
```

**关键代码：**
```typescript
@Controller('users')  // 👈 路由前缀
export class UsersController {
  @Get()              // 👈 GET 请求
  @Post()             // 👈 POST 请求
  @Patch(':id')       // 👈 PATCH 请求
  @Delete(':id')      // 👈 DELETE 请求
}
```

---

### 3. `xxx.service.ts` - 业务逻辑

**作用：** 处理具体业务逻辑，操作数据库

**前端类比：**
```typescript
// 前端：自定义 Hook
function useUsers() {
  const [users, setUsers] = useState([])
  
  const fetchUsers = async () => {
    const data = await fetch('/api/users')
    setUsers(data)
  }
  
  return { users, fetchUsers }
}

// 后端：Service
export class UsersService {
  async findAll() {
    return this.prisma.user.findMany()  // 从数据库获取
  }
}
```

**关键代码：**
```typescript
export class UsersService {
  constructor(private prisma: PrismaService) {}
  
  async findAll() { ... }      // 👈 业务逻辑方法
  async findOne() { ... }
  async create() { ... }
}
```

---

### 4. `dto/` - 数据传输对象

**作用：** 定义请求数据的格式和验证规则

**前端类比：**
```typescript
// 前端：TypeScript 接口
interface CreateUserRequest {
  name: string
  email: string
  password: string
}

// 后端：DTO（带验证）
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string
  
  @IsEmail()
  email: string
}
```

**关键代码：**
```typescript
export class CreateUserDto {
  @IsString()           // 👈 验证：必须是字符串
  @IsNotEmpty()         // 👈 验证：不能为空
  @IsEmail()            // 👈 验证：必须是邮箱格式
  name: string
  email: string
}
```

---

### 5. `entities/` - 数据实体

**作用：** 定义数据结构（现在主要用 Prisma Schema）

**前端类比：**
```typescript
// 前端：类型定义
interface User {
  id: number
  name: string
  email: string
}

// 后端：实体定义（现在用 Prisma Schema）
model User {
  id    Int    @id
  name  String
  email String
}
```

**注意：** 使用 Prisma 后，实体主要在 `prisma/schema.prisma` 中定义。

---

## 🔄 模块之间的依赖关系

### Users 模块

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // 👈 导出，供其他模块使用
})
export class UsersModule {}
```

**依赖：**
- 使用 `PrismaService`（全局模块，自动可用）
- 被 `AuthModule` 使用（`AuthService` 需要 `UsersService`）

### Auth 模块

```typescript
@Module({
  imports: [
    UsersModule,  // 👈 导入 UsersModule，使用 UsersService
    JwtModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],  // 👈 导出，供其他模块使用
})
export class AuthModule {}
```

**依赖：**
- 导入 `UsersModule`（使用 `UsersService`）
- 使用 `JwtModule` 和 `PassportModule`
- 被其他模块使用（导出 `AuthService`）

---

## 🎨 模块化架构的优势

### 1. 职责分离

```
Controller → 处理 HTTP 请求（路由）
Service    → 处理业务逻辑（数据操作）
DTO        → 验证请求数据
Module     → 组织所有文件
```

### 2. 易于维护

- 每个功能一个文件夹
- 相关文件放在一起
- 修改一个功能不影响其他功能

### 3. 易于扩展

添加新功能时，只需创建新模块：

```
src/
├── users/      ← 用户模块
├── auth/       ← 认证模块
├── products/   ← 产品模块（新增）
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── dto/
└── orders/     ← 订单模块（新增）
    ├── orders.module.ts
    ├── orders.controller.ts
    ├── orders.service.ts
    └── dto/
```

---

## 📋 标准模块模板

### 创建新模块的标准结构

```
模块名/
├── 模块名.module.ts       ← 必需
├── 模块名.controller.ts   ← 必需
├── 模块名.service.ts      ← 必需
├── dto/                   ← 可选（如果有请求验证）
│   └── create-xxx.dto.ts
├── entities/              ← 可选（如果用 TypeORM）
│   └── xxx.entity.ts
└── types/                 ← 可选（如果有自定义类型）
    └── xxx.types.ts
```

---

## 🔍 两个模块的差异

### Users 模块特有

- `entities/user.entity.ts` - 实体定义（现在主要用 Prisma）
- `types/user.types.ts` - 类型定义

### Auth 模块特有

- `jwt.strategy.ts` - JWT 验证策略
- `jwt-auth.guard.ts` - JWT 认证守卫

**原因：**
- Users 模块：主要处理用户数据
- Auth 模块：需要 JWT 认证功能

---

## 💡 总结

### 核心模式

1. **每个功能一个模块**（users、auth）
2. **每个模块标准结构**（module、controller、service）
3. **按需添加其他文件**（dto、entities、types）

### 前端类比

```
前端组件结构         后端模块结构
┌─────────────┐     ┌─────────────┐
│ Component   │  =  │ Controller  │
│ Hook        │  =  │ Service     │
│ Types       │  =  │ DTO/Entity  │
│ Styles      │  =  │ Module      │
└─────────────┘     └─────────────┘
```

### 关键理解

- **Module** = 组织者（类似 Context Provider）
- **Controller** = API 路由（类似 React Router）
- **Service** = 业务逻辑（类似自定义 Hook）
- **DTO** = 类型验证（类似 TypeScript 接口 + 验证）

这就是 NestJS 的模块化架构模式！每个功能模块都遵循这个结构，保持代码组织清晰和一致。
