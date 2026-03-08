# 🚀 快速连接数据库指南

## ✅ 当前状态

从 Docker 界面可以看到：
- ✅ `fund_coach_db` 容器正在运行
- ✅ 端口映射：`5432:5432`
- ✅ 镜像：`postgres:16`

**数据库信息：**
- 数据库名：`fund_coach`
- 用户名：`admin`
- 密码：`password123`
- 主机：`localhost`
- 端口：`5432`

---

## 📝 第一步：创建 .env 文件

在 `backend` 目录下创建 `.env` 文件：

```env
# 数据库配置（根据 docker-compose.yml）
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"

# JWT 配置
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
```

**重要：** 连接字符串格式：
```
postgresql://用户名:密码@主机:端口/数据库名?schema=public
```

---

## 🔌 第二步：测试数据库连接

### 方法 1：使用 Docker 命令（最简单）

打开终端，运行：

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach
```

**如果成功，你会看到：**
```
psql (16.x)
Type "help" for help.

fund_coach=#
```

**常用命令：**
```sql
-- 查看所有表
\dt

-- 查看当前数据库
SELECT current_database();

-- 退出
\q
```

### 方法 2：使用 Prisma Studio（推荐，可视化）

```bash
cd backend
npm run prisma:generate
npm run prisma:studio
```

这会打开浏览器，显示数据库内容。

---

## 🗄️ 第三步：初始化数据库表结构

### 1. 生成 Prisma Client

```bash
cd backend
npm run prisma:generate
```

### 2. 运行数据库迁移

```bash
npm run prisma:migrate
```

**首次运行会提示：**
```
? Enter a name for the new migration: › init
```

输入 `init` 然后回车。

**如果成功，你会看到：**
```
✅ The following migration has been created and applied from new schema changes:

migrations/
  └─ 20240101000000_init/
    └─ migration.sql

✔ Generated Prisma Client
```

### 3. 验证表已创建

使用 Docker 命令查看：

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "\dt"
```

应该看到 `users` 表。

---

## 🎯 第四步：启动后端服务

```bash
cd backend
npm run dev
```

**如果连接成功，你会看到：**
```
✅ 数据库连接成功
🚀 后端服务运行在: http://localhost:3001
📡 API 地址: http://localhost:3001/api
```

---

## 🔍 验证连接的方法

### 方法 1：使用 Prisma Studio（最简单）

```bash
cd backend
npm run prisma:studio
```

浏览器会自动打开 `http://localhost:5555`，你可以看到数据库中的所有表和数据。

### 方法 2：使用 Docker 命令

```bash
# 连接数据库
docker exec -it fund_coach_db psql -U admin -d fund_coach

# 在 psql 中执行
SELECT * FROM users;
```

### 方法 3：测试 API

1. **注册用户**
   ```bash
   POST http://localhost:3001/api/auth/register
   {
     "name": "测试用户",
     "email": "test@example.com",
     "password": "123456"
   }
   ```

2. **查看用户列表**（需要先登录获取 Token）
   ```bash
   GET http://localhost:3001/api/users
   Authorization: Bearer <token>
   ```

---

## ❓ 常见问题

### 问题 1：连接被拒绝

**错误信息：** `Can't reach database server`

**解决方法：**
1. 检查容器是否运行：在 Docker 界面确认 `fund_coach_db` 是绿色（运行中）
2. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
3. 检查端口是否被占用

### 问题 2：数据库不存在

**错误信息：** `database "fund_coach" does not exist`

**解决方法：**
Docker Compose 会自动创建数据库，如果不存在：
```bash
docker-compose down
docker-compose up -d
```

### 问题 3：Prisma Client 未生成

**错误信息：** `Cannot find module '@prisma/client'`

**解决方法：**
```bash
npm install
npm run prisma:generate
```

---

## 📋 完整操作流程

```bash
# 1. 进入后端目录
cd backend

# 2. 创建 .env 文件（如果还没有）
# 复制上面的 .env 内容

# 3. 安装依赖（如果还没安装）
npm install

# 4. 生成 Prisma Client
npm run prisma:generate

# 5. 运行数据库迁移
npm run prisma:migrate
# 输入迁移名称：init

# 6. 启动服务
npm run dev

# 7. 在另一个终端，打开 Prisma Studio 查看数据
npm run prisma:studio
```

---

## 🎉 完成！

现在你的数据库已经连接成功，可以：
- ✅ 存储用户数据
- ✅ 数据持久化（重启不会丢失）
- ✅ 使用 Prisma Studio 可视化查看数据
- ✅ 通过 API 操作数据
