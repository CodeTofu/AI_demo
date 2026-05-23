# 连接数据库指南

## 🐳 Docker 已启动，现在连接数据库

根据你的 `docker-compose.yml` 配置：
- **数据库名**：`fund_coach`
- **用户名**：`admin`
- **密码**：`password123`
- **端口**：`5432`

---

## 方法一：使用 Docker 命令连接（推荐，无需安装客户端）

### 连接到数据库

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach
```

**说明：**
- `docker exec -it` - 在运行的容器中执行命令
- `fund_coach_db` - 容器名称
- `psql` - PostgreSQL 命令行工具
- `-U admin` - 用户名
- `-d fund_coach` - 数据库名

### 连接成功后，你可以执行 SQL 命令：

```sql
-- 查看所有表
\dt

-- 查看 users 表结构
\d users

-- 查看所有用户
SELECT * FROM users;

-- 退出
\q
```

---

## 方法二：使用本地 psql 客户端（需要安装 PostgreSQL）

### 1. 检查是否已安装 psql

```bash
psql --version
```

### 2. 如果未安装，需要先安装 PostgreSQL 客户端

**Windows:**
- 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)
- 或使用 Chocolatey: `choco install postgresql`

**Mac:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql-client
```

### 3. 连接数据库

```bash
psql -h localhost -p 5432 -U admin -d fund_coach
```

**提示输入密码时，输入：** `password123`

---

## 方法三：使用图形化工具（推荐用于查看数据）

### 1. DBeaver（免费，跨平台）

1. 下载：https://dbeaver.io/download/
2. 安装后，创建新连接：
   - **类型**：PostgreSQL
   - **主机**：localhost
   - **端口**：5432
   - **数据库**：fund_coach
   - **用户名**：admin
   - **密码**：password123

### 2. pgAdmin（PostgreSQL 官方工具）

1. 下载：https://www.pgadmin.org/download/
2. 安装后，添加服务器：
   - **名称**：fund_coach
   - **主机**：localhost
   - **端口**：5432
   - **数据库**：fund_coach
   - **用户名**：admin
   - **密码**：password123

### 3. TablePlus（Mac/Windows，界面美观）

1. 下载：https://tableplus.com/
2. 创建新连接，选择 PostgreSQL
3. 填写连接信息

---

## 方法四：使用 Prisma Studio（可视化数据库，推荐）

这是最简单的方法，专门为 Prisma 项目设计：

```bash
cd backend
npm run prisma:studio
```

这会自动打开浏览器，显示数据库中的所有表和数据。

---

## ⚙️ 配置 .env 文件

在连接数据库之前，需要确保 `.env` 文件配置正确。

### 创建 .env 文件

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

**连接字符串格式：**
```
postgresql://用户名:密码@主机:端口/数据库名?schema=public
```

---

## ✅ 验证连接

### 1. 检查容器是否运行

```bash
docker ps
```

应该看到 `fund_coach_db` 容器在运行。

### 2. 测试连接（使用 Docker）

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "SELECT version();"
```

如果成功，会显示 PostgreSQL 版本信息。

### 3. 使用 Prisma 验证

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

如果连接成功，会创建数据库表。

---

## 🚀 快速开始（推荐流程）

### 1. 确保 Docker 容器运行

```bash
docker ps
```

### 2. 创建 .env 文件

```bash
cd backend
# 创建 .env 文件，内容如上
```

### 3. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 4. 运行数据库迁移

```bash
npm run prisma:migrate
```

首次运行会提示输入迁移名称，输入：`init`

### 5. 使用 Prisma Studio 查看数据库

```bash
npm run prisma:studio
```

---

## 🔍 常用数据库操作命令

### 使用 Docker 连接后：

```sql
-- 列出所有数据库
\l

-- 连接到数据库
\c fund_coach

-- 列出所有表
\dt

-- 查看表结构
\d users

-- 查看表数据
SELECT * FROM users;

-- 查看表数据（限制行数）
SELECT * FROM users LIMIT 10;

-- 统计记录数
SELECT COUNT(*) FROM users;

-- 退出
\q
```

---

## ❓ 常见问题

### 1. 连接被拒绝

**错误：** `connection refused`

**解决：**
- 检查 Docker 容器是否运行：`docker ps`
- 检查端口是否被占用：`netstat -an | findstr 5432` (Windows)

### 2. 认证失败

**错误：** `password authentication failed`

**解决：**
- 检查用户名和密码是否正确
- 确认使用的是 `admin` 和 `password123`

### 3. 数据库不存在

**错误：** `database "fund_coach" does not exist`

**解决：**
- Docker Compose 会自动创建数据库
- 如果不存在，检查容器日志：`docker-compose logs db`

### 4. Prisma 连接失败

**错误：** `Can't reach database server`

**解决：**
- 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
- 确保 Docker 容器正在运行
- 检查端口映射是否正确

---

## 📝 下一步

连接成功后，你可以：

1. **运行数据库迁移**
   ```bash
   npm run prisma:migrate
   ```

2. **启动后端服务**
   ```bash
   npm run dev
   ```

3. **测试 API**
   - 注册用户
   - 登录
   - 查看用户列表

4. **使用 Prisma Studio 查看数据**
   ```bash
   npm run prisma:studio
   ```
