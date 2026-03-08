# 📁 Prisma 文件夹详解

## 📋 核心作用

**`prisma/` 文件夹是 Prisma ORM 的配置和迁移文件目录，用于：**
1. 定义数据库结构（Schema）
2. 管理数据库版本（Migrations）
3. 生成类型安全的数据库客户端

---

## 📂 文件夹结构

```
backend/prisma/
├── schema.prisma          # 数据库模型定义文件
└── migrations/            # 数据库迁移文件目录
    ├── migration_lock.toml
    └── 20260227133849_init/
        └── migration.sql
```

---

## 🎯 文件详解

### 1. `schema.prisma` - 数据库模型定义

**作用：** 定义数据库表结构和连接配置

```1:23:backend/prisma/schema.prisma
// Prisma Schema 文件
// 定义数据库模型和连接配置

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id        Int      @id @default(autoincrement()) // 主键，自增
  name      String   // 姓名
  email     String   @unique // 邮箱，唯一索引
  password  String   // 密码（加密后存储）
  createdAt DateTime @default(now()) // 创建时间
  updatedAt DateTime @updatedAt // 更新时间

  @@map("users") // 数据库表名
}
```

#### 组成部分

**1. Generator（生成器）**
```prisma
generator client {
  provider = "prisma-client-js"
}
```
- **作用：** 告诉 Prisma 生成 JavaScript/TypeScript 客户端
- **前端类比：** 类似 `tsconfig.json`，告诉 TypeScript 如何编译代码

**2. Datasource（数据源）**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
- **作用：** 配置数据库连接信息
- **provider：** 数据库类型（PostgreSQL、MySQL、SQLite 等）
- **url：** 数据库连接字符串（从环境变量读取）

**3. Model（模型）**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```
- **作用：** 定义数据库表结构
- **前端类比：** 类似 TypeScript 接口定义

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

#### 关键语法说明

| 语法 | 作用 | 示例 |
|------|------|------|
| `@id` | 主键 | `id Int @id` |
| `@default(autoincrement())` | 自增 | `id Int @id @default(autoincrement())` |
| `@unique` | 唯一索引 | `email String @unique` |
| `@default(now())` | 默认当前时间 | `createdAt DateTime @default(now())` |
| `@updatedAt` | 自动更新时间 | `updatedAt DateTime @updatedAt` |
| `@@map("users")` | 数据库表名 | `@@map("users")` |

---

### 2. `migrations/` - 数据库迁移文件

**作用：** 记录数据库结构变更历史，用于版本控制

#### 迁移文件结构

```
migrations/
├── migration_lock.toml        # 锁定数据库类型
└── 20260227133849_init/       # 迁移版本（时间戳_名称）
    └── migration.sql          # SQL 迁移脚本
```

#### `migration_lock.toml`

**作用：** 锁定数据库类型，防止在不同数据库之间切换

```toml
# 示例内容
provider = "postgresql"
```

**为什么需要：**
- 确保团队使用相同的数据库类型
- 防止意外切换到其他数据库（如 MySQL）

#### `migration.sql`

**作用：** 实际的 SQL 脚本，用于创建或修改数据库表

**示例内容：**
```sql
-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

**前端类比：**
```typescript
// 前端：类似 Git 提交历史
// commit 1: 创建 User 组件
// commit 2: 添加 email 验证
// commit 3: 添加密码强度检查

// 后端：类似数据库迁移历史
// migration 1: 创建 users 表
// migration 2: 添加 email 唯一索引
// migration 3: 添加 created_at 字段
```

---

## 🔄 Prisma 工作流程

### 1. 定义 Schema

**编辑 `schema.prisma`：**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

### 2. 生成 Prisma Client

**运行命令：**
```bash
npm run prisma:generate
```

**作用：**
- 读取 `schema.prisma`
- 生成 TypeScript 类型定义
- 创建 Prisma Client（`@prisma/client`）

**生成的文件位置：**
```
node_modules/.prisma/client/
```

### 3. 创建迁移

**运行命令：**
```bash
npm run prisma:migrate
```

**作用：**
- 比较 Schema 和数据库的差异
- 生成 SQL 迁移脚本
- 在 `migrations/` 目录创建迁移文件
- 执行迁移，更新数据库结构

### 4. 使用 Prisma Client

**在代码中使用：**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 查询所有用户
const users = await prisma.user.findMany();
```

---

## 📊 完整数据流

```
┌─────────────────────────────────────────┐
│  1. 编辑 schema.prisma                  │
│  定义数据库模型                          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  2. 运行 prisma:generate                 │
│  生成 TypeScript 类型和 Prisma Client    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  3. 运行 prisma:migrate                  │
│  生成迁移文件（migrations/）             │
│  执行 SQL，更新数据库结构                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  4. 在代码中使用 Prisma Client           │
│  prisma.user.findMany()                 │
└─────────────────────────────────────────┘
```

---

## 🎯 为什么需要这个文件夹？

### 1. 版本控制

**迁移文件记录每次数据库结构变更：**
```
migrations/
├── 20260227133849_init/          # 初始版本：创建 users 表
├── 20260228000000_add_avatar/     # 添加 avatar 字段
└── 20260229000000_add_role/      # 添加 role 字段
```

**好处：**
- 可以回滚到任意版本
- 团队成员可以同步数据库结构
- 生产环境可以逐步升级

**前端类比：**
```typescript
// 前端：Git 版本控制
git log
// commit 1: 创建 User 组件
// commit 2: 添加 avatar 属性
// commit 3: 添加 role 属性

// 后端：数据库迁移版本控制
migrations/
// migration 1: 创建 users 表
// migration 2: 添加 avatar 字段
// migration 3: 添加 role 字段
```

### 2. 类型安全

**Schema 定义 → 自动生成 TypeScript 类型：**
```prisma
// schema.prisma
model User {
  id   Int    @id
  name String
}
```

```typescript
// 自动生成的类型（@prisma/client）
type User = {
  id: number
  name: string
}

// 使用时有完整的类型提示
const user: User = await prisma.user.findUnique({
  where: { id: 1 }
})
```

### 3. 数据库无关性

**同一个 Schema 可以用于不同数据库：**
```prisma
datasource db {
  provider = "postgresql"  // 可以改为 "mysql" 或 "sqlite"
  url      = env("DATABASE_URL")
}
```

**好处：**
- 开发环境用 SQLite（简单）
- 生产环境用 PostgreSQL（强大）
- 代码不需要修改

---

## 💡 实际应用场景

### 场景 1：添加新字段

**1. 修改 Schema：**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  avatar    String?  // 👈 新增字段（可选）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

**2. 创建迁移：**
```bash
npm run prisma:migrate
# 输入迁移名称：add_avatar
```

**3. 自动生成迁移文件：**
```sql
-- migrations/20260228000000_add_avatar/migration.sql
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
```

**4. 数据库自动更新：**
- 迁移文件自动执行
- `users` 表添加 `avatar` 字段

### 场景 2：回滚迁移

**如果迁移出错，可以回滚：**
```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到上一个版本
npx prisma migrate resolve --rolled-back 20260228000000_add_avatar
```

### 场景 3：团队协作

**团队成员同步数据库结构：**
```bash
# 1. 拉取最新代码（包含新的迁移文件）
git pull

# 2. 应用迁移到本地数据库
npm run prisma:migrate
```

**好处：**
- 所有人的数据库结构一致
- 不需要手动执行 SQL
- 迁移历史清晰可见

---

## 🔍 与其他文件的关系

### 1. `src/prisma/prisma.service.ts`

**使用生成的 Prisma Client：**
```typescript
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  // 使用 Prisma Client 的方法
  // prisma.user.findMany()
  // prisma.user.create()
}
```

**关系：**
- `schema.prisma` 定义结构
- `prisma:generate` 生成 `PrismaClient`
- `PrismaService` 使用 `PrismaClient`

### 2. `src/users/users.service.ts`

**使用 PrismaService：**
```typescript
constructor(private prisma: PrismaService) {}

async findAll() {
  return this.prisma.user.findMany();  // 👈 使用 Prisma Client
}
```

**关系：**
- `schema.prisma` 定义 `User` 模型
- `PrismaService` 提供数据库连接
- `UsersService` 使用 `PrismaService` 操作数据库

---

## 📝 常用命令

### 生成 Prisma Client
```bash
npm run prisma:generate
```
**作用：** 根据 Schema 生成 TypeScript 类型和客户端

### 创建并应用迁移
```bash
npm run prisma:migrate
```
**作用：** 创建迁移文件并应用到数据库

### 查看迁移状态
```bash
npx prisma migrate status
```
**作用：** 查看哪些迁移已应用，哪些待应用

### 打开 Prisma Studio
```bash
npm run prisma:studio
```
**作用：** 可视化查看和编辑数据库数据

### 重置数据库（开发环境）
```bash
npx prisma migrate reset
```
**作用：** 删除所有数据，重新应用所有迁移

---

## 🎯 总结

### `prisma/` 文件夹的作用

1. **定义数据库结构**（`schema.prisma`）
   - 定义表结构、字段类型、索引等
   - 类似前端的 TypeScript 接口定义

2. **管理数据库版本**（`migrations/`）
   - 记录每次数据库结构变更
   - 类似 Git 的版本控制
   - 可以回滚和同步

3. **生成类型安全的客户端**
   - 根据 Schema 自动生成 TypeScript 类型
   - 提供类型安全的数据库操作方法

### 前端类比

```typescript
// 前端：类型定义
interface User {
  id: number
  name: string
}

// 后端：Schema 定义
model User {
  id   Int    @id
  name String
}

// 前端：使用类型
const user: User = { id: 1, name: '张三' }

// 后端：使用 Prisma Client
const user = await prisma.user.findUnique({ where: { id: 1 } })
```

### 关键理解

- **`schema.prisma`** = 数据库结构定义（类似 TypeScript 接口）
- **`migrations/`** = 数据库变更历史（类似 Git 提交历史）
- **`prisma:generate`** = 生成类型和客户端（类似 `tsc` 编译）
- **`prisma:migrate`** = 应用变更到数据库（类似部署代码）

**这就是 Prisma 的核心工作流程！**
