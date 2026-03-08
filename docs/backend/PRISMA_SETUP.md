# Prisma + PostgreSQL 设置指南

## 📋 前置要求

1. **安装 PostgreSQL**
   - Windows: 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **创建数据库**
   ```sql
   -- 使用 psql 或 pgAdmin 连接到 PostgreSQL
   CREATE DATABASE nestjs_demo;
   ```

## 🚀 设置步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（如果不存在）：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，修改数据库连接字符串：

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/nestjs_demo?schema=public"
```

**示例：**
- 如果用户名是 `postgres`，密码是 `123456`
- 连接字符串：`postgresql://postgres:123456@localhost:5432/nestjs_demo?schema=public`

### 3. 生成 Prisma Client

```bash
npm run prisma:generate
```

这个命令会：
- 读取 `prisma/schema.prisma` 文件
- 生成 TypeScript 类型定义
- 创建 Prisma Client

### 4. 运行数据库迁移

```bash
npm run prisma:migrate
```

这个命令会：
- 创建数据库表结构
- 生成迁移文件
- 应用迁移到数据库

**首次运行时会提示输入迁移名称，可以输入：`init`**

### 5. 启动服务

```bash
npm run dev
```

## 📊 查看数据库

### 使用 Prisma Studio（可视化工具）

```bash
npm run prisma:studio
```

这会打开浏览器，显示数据库中的所有数据。

### 使用 psql（命令行）

```bash
psql -U postgres -d nestjs_demo

# 查看所有表
\dt

# 查看 users 表结构
\d users

# 查看所有用户
SELECT * FROM users;
```

## 🔧 常用 Prisma 命令

```bash
# 生成 Prisma Client
npm run prisma:generate

# 创建并应用迁移
npm run prisma:migrate

# 打开 Prisma Studio（可视化数据库）
npm run prisma:studio

# 重置数据库（删除所有数据）
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

## 📝 修改数据模型

如果你修改了 `prisma/schema.prisma` 文件：

1. **创建新的迁移**
   ```bash
   npm run prisma:migrate
   ```
   输入迁移名称，例如：`add_user_avatar`

2. **应用迁移**
   迁移会自动应用到数据库

3. **重新生成 Client**
   ```bash
   npm run prisma:generate
   ```

## ⚠️ 常见问题

### 1. 连接数据库失败

**错误：** `Can't reach database server`

**解决方案：**
- 检查 PostgreSQL 服务是否启动
- 检查 `.env` 文件中的连接字符串是否正确
- 检查数据库是否存在

### 2. 迁移失败

**错误：** `Migration failed`

**解决方案：**
- 检查数据库连接
- 查看迁移文件是否有语法错误
- 可以尝试重置数据库：`npx prisma migrate reset`

### 3. Prisma Client 未生成

**错误：** `Cannot find module '@prisma/client'`

**解决方案：**
```bash
npm run prisma:generate
```

## 🎯 下一步

数据库设置完成后，你可以：

1. **测试 API**
   - 注册新用户
   - 登录
   - 查看用户列表

2. **查看数据**
   - 使用 Prisma Studio 查看数据库中的数据
   - 验证数据是否正确存储

3. **扩展功能**
   - 添加更多字段到 User 模型
   - 创建新的模型（如 Post、Comment 等）
   - 建立表之间的关系

## 📚 学习资源

- [Prisma 官方文档](https://www.prisma.io/docs)
- [NestJS + Prisma 教程](https://docs.nestjs.com/recipes/prisma)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
