# 🧪 测试数据库存储

## ✅ 第一步：验证数据库表是否已创建

### 方法 1：使用 Docker 命令（快速检查）

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "\dt"
```

**如果看到 `users` 表，说明表已创建：**
```
        List of relations
 Schema | Name  | Type  | Owner
--------+-------+-------+-------
 public | users | table | admin
```

**如果表不存在，需要运行迁移：**
```bash
cd backend
npm run prisma:migrate
```

### 方法 2：使用 Prisma Studio（可视化）

```bash
cd backend
npm run prisma:studio
```

打开浏览器后，如果能看到 `User` 模型，说明表已创建。

---

## 🚀 第二步：测试存储数据

### 方式 1：通过 API 注册用户（推荐）

#### 使用 Postman 或 curl：

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

**成功响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com"
  }
}
```

#### 使用 PowerShell（Windows）：

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"name":"张三","email":"zhangsan@example.com","password":"123456"}'
```

### 方式 2：使用前端页面

1. 打开前端：`http://localhost:3000`
2. 点击"立即注册"
3. 填写信息并注册
4. 数据会自动保存到数据库

---

## 🔍 第三步：验证数据已存储

### 方法 1：使用 Prisma Studio（最简单）

```bash
cd backend
npm run prisma:studio
```

在浏览器中：
1. 点击 `User` 模型
2. 应该能看到刚才注册的用户数据

### 方法 2：使用 Docker 命令

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "SELECT id, name, email, \"createdAt\" FROM users;"
```

**应该看到：**
```
 id | name |        email         |      createdAt
----+------+----------------------+---------------------
  1 | 张三  | zhangsan@example.com | 2024-02-27 13:45:00
```

### 方法 3：通过 API 查看用户列表

先登录获取 Token：

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

然后使用 Token 查看用户列表：

```bash
GET http://localhost:3001/api/users
Authorization: Bearer <你的token>
```

---

## ✅ 完整测试流程

### 1. 检查表是否存在

```bash
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "\dt"
```

### 2. 如果表不存在，运行迁移

```bash
cd backend
npm run prisma:migrate
```

### 3. 注册用户（存储数据）

```bash
POST http://localhost:3001/api/auth/register
{
  "name": "测试用户",
  "email": "test@example.com",
  "password": "123456"
}
```

### 4. 验证数据已存储

```bash
# 使用 Prisma Studio
npm run prisma:studio

# 或使用 Docker 命令
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "SELECT * FROM users;"
```

---

## 🎯 快速验证命令

**一键检查所有内容：**

```bash
# 1. 检查表是否存在
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "\dt"

# 2. 查看用户数据
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "SELECT id, name, email FROM users;"

# 3. 统计用户数量
docker exec -it fund_coach_db psql -U admin -d fund_coach -c "SELECT COUNT(*) FROM users;"
```

---

## ❓ 如果遇到问题

### 问题 1：表不存在

**错误：** `relation "users" does not exist`

**解决：**
```bash
cd backend
npm run prisma:migrate
```

### 问题 2：连接失败

**错误：** `Can't reach database server`

**解决：**
- 检查 Docker 容器是否运行：`docker ps`
- 检查 `.env` 文件中的 `DATABASE_URL` 是否正确

### 问题 3：数据没有保存

**检查：**
- 查看后端服务日志，是否有错误信息
- 确认 API 返回了成功响应
- 使用 Prisma Studio 查看数据库

---

## 🎉 成功标志

如果以下都正常，说明数据存储成功：

1. ✅ 服务启动时显示：`✅ 数据库连接成功`
2. ✅ API 注册返回成功响应
3. ✅ Prisma Studio 能看到用户数据
4. ✅ Docker 命令查询到数据

现在你可以开始使用数据库存储数据了！
