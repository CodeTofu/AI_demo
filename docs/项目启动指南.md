# 🚀 项目启动指南

## 📋 前置检查清单

在启动项目之前，请确保：

- ✅ Node.js >= 18.0.0 已安装
- ✅ Docker Desktop 已安装并运行
- ✅ PostgreSQL 数据库容器已启动

---

## 🗄️ 第一步：启动数据库（如果还没启动）

### 检查数据库容器状态

```bash
cd backend
docker ps --filter "name=fund_coach_db"
```

**如果看到容器正在运行，跳过这一步。**

**如果容器没有运行，执行：**

```bash
cd backend
docker-compose up -d
```

**验证数据库是否启动成功：**

```bash
docker ps --filter "name=fund_coach_db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**应该看到：**
```
NAMES            STATUS          PORTS
fund_coach_db    Up X minutes    0.0.0.0:5432->5432/tcp
```

---

## ⚙️ 第二步：配置后端环境变量

### 检查 `.env` 文件

```bash
cd backend
# 检查 .env 文件是否存在
dir .env
```

**如果 `.env` 文件不存在，创建它：**

```bash
# Windows PowerShell
@"
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001
"@ | Out-File -FilePath .env -Encoding utf8
```

**或者手动创建 `backend/.env` 文件，内容如下：**

```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/fund_coach?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001
```

---

## 📦 第三步：安装依赖（如果还没安装）

### 安装后端依赖

```bash
cd backend
npm install
```

### 安装前端依赖

```bash
cd frontend
npm install
```

---

## 🔧 第四步：初始化数据库（首次运行）

**如果是第一次运行，需要生成 Prisma Client 和运行迁移：**

```bash
cd backend

# 1. 生成 Prisma Client
npm run prisma:generate

# 2. 运行数据库迁移（创建表结构）
npm run prisma:migrate
# 输入迁移名称：init
```

**如果已经运行过迁移，可以跳过这一步。**

---

## 🚀 第五步：启动后端服务

### 打开第一个终端窗口

```bash
cd backend
npm run dev
```

**如果启动成功，你会看到：**

```
✅ 数据库连接成功
🚀 后端服务运行在: http://localhost:3001
📡 API 地址: http://localhost:3001/api
```

**保持这个终端窗口打开！**

---

## 🎨 第六步：启动前端服务

### 打开第二个终端窗口

```bash
cd frontend
npm run dev
```

**如果启动成功，你会看到：**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**保持这个终端窗口打开！**

---

## ✅ 第七步：验证服务运行

### 1. 检查后端 API

打开浏览器访问：`http://localhost:3001/api`

**或者使用 curl（Windows PowerShell）：**

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api" -Method GET
```

**应该返回：**
```json
{
  "message": "API is running"
}
```

### 2. 检查前端应用

打开浏览器访问：`http://localhost:3000`

**应该看到登录页面。**

---

## 🎯 完整启动命令（快速参考）

### 方式一：分步启动（推荐）

```bash
# 终端 1：启动数据库（如果还没启动）
cd backend
docker-compose up -d

# 终端 2：启动后端
cd backend
npm run dev

# 终端 3：启动前端
cd frontend
npm run dev
```

### 方式二：使用脚本（需要创建）

**Windows PowerShell 脚本：**

```powershell
# start-all.ps1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

**运行脚本：**

```powershell
.\start-all.ps1
```

---

## 🔍 验证项目是否正常运行

### 1. 测试注册功能

1. 打开浏览器：`http://localhost:3000/register`
2. 填写信息：
   - 姓名：测试用户
   - 邮箱：test@example.com
   - 密码：123456
3. 点击"注册"

**如果成功，会自动跳转到登录页面。**

### 2. 测试登录功能

1. 打开浏览器：`http://localhost:3000/login`
2. 输入刚才注册的邮箱和密码
3. 点击"登录"

**如果成功，会跳转到主页，显示用户列表。**

### 3. 测试 API（可选）

**使用 PowerShell 测试注册接口：**

```powershell
$body = @{
    name = "API测试用户"
    email = "apitest@example.com"
    password = "123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## ❌ 常见问题排查

### 问题 1：后端启动失败 - 数据库连接错误

**错误信息：**
```
Can't reach database server
```

**解决方法：**
1. 检查 Docker 容器是否运行：
   ```bash
   docker ps --filter "name=fund_coach_db"
   ```
2. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
3. 重启数据库容器：
   ```bash
   cd backend
   docker-compose restart
   ```

### 问题 2：后端启动失败 - Prisma Client 未生成

**错误信息：**
```
Cannot find module '@prisma/client'
```

**解决方法：**
```bash
cd backend
npm run prisma:generate
```

### 问题 3：前端启动失败 - 端口被占用

**错误信息：**
```
Port 3000 is already in use
```

**解决方法：**
1. 关闭占用端口的程序
2. 或者修改 `frontend/vite.config.ts` 中的端口号

### 问题 4：前端无法连接后端

**错误信息：**
```
Network Error
```

**解决方法：**
1. 确认后端服务正在运行（`http://localhost:3001`）
2. 检查 `frontend/vite.config.ts` 中的代理配置
3. 检查浏览器控制台的错误信息

### 问题 5：数据库迁移失败

**错误信息：**
```
Migration failed
```

**解决方法：**
```bash
cd backend
# 查看迁移状态
npx prisma migrate status

# 如果迁移有问题，可以重置数据库（⚠️ 会删除所有数据）
npx prisma migrate reset
```

---

## 📊 服务端口说明

| 服务 | 端口 | 地址 |
|------|------|------|
| 前端应用 | 3000 | http://localhost:3000 |
| 后端 API | 3001 | http://localhost:3001/api |
| 数据库 | 5432 | localhost:5432 |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## 🎉 启动成功标志

### 后端成功标志

- ✅ 终端显示：`✅ 数据库连接成功`
- ✅ 终端显示：`🚀 后端服务运行在: http://localhost:3001`
- ✅ 访问 `http://localhost:3001/api` 有响应

### 前端成功标志

- ✅ 终端显示：`Local: http://localhost:3000/`
- ✅ 浏览器能打开登录页面
- ✅ 没有控制台错误

---

## 📝 日常开发流程

### 每天第一次启动

```bash
# 1. 启动数据库（如果关闭了）
cd backend
docker-compose up -d

# 2. 启动后端（终端 1）
cd backend
npm run dev

# 3. 启动前端（终端 2）
cd frontend
npm run dev
```

### 停止服务

**停止前端：** 在终端按 `Ctrl + C`

**停止后端：** 在终端按 `Ctrl + C`

**停止数据库：**
```bash
cd backend
docker-compose down
```

---

## 🔧 开发工具推荐

### 1. Prisma Studio（可视化数据库）

```bash
cd backend
npm run prisma:studio
```

**打开浏览器：`http://localhost:5555`**

### 2. API 测试工具

- **Postman** - 图形化 API 测试
- **Thunder Client** - VS Code 插件
- **curl** - 命令行工具

---

## 📚 下一步

项目启动成功后，你可以：

1. **测试登录功能** - 注册和登录用户
2. **查看用户列表** - 登录后查看主页
3. **使用 Prisma Studio** - 可视化查看数据库数据
4. **阅读代码** - 理解前后端交互流程
5. **添加新功能** - 参考 `docs/backend/ADD_NEW_MODEL_GUIDE.md` 添加新模型

---

## 🆘 需要帮助？

如果遇到问题：

1. 检查终端错误信息
2. 查看浏览器控制台（F12）
3. 确认所有服务都在运行
4. 检查 `.env` 文件配置
5. 查看相关文档：
   - `docs/backend/QUICK_START.md` - 快速开始
   - `docs/backend/PRISMA_SETUP.md` - 数据库设置
   - `docs/backend/ADD_NEW_MODEL_GUIDE.md` - 添加新模型
