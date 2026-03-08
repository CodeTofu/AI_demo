# 后端项目 - NestJS + TypeScript

这是一个使用 NestJS 框架构建的后端项目，展示了 RESTful API 的基本实现。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

后端服务将在 `http://localhost:3001` 运行，API 地址为 `http://localhost:3001/api`

## 📁 项目结构

```
backend/
├── src/
│   ├── users/              # 用户模块
│   │   ├── dto/            # 数据传输对象
│   │   │   └── create-user.dto.ts
│   │   ├── entities/       # 实体类
│   │   │   └── user.entity.ts
│   │   ├── users.controller.ts  # 控制器
│   │   ├── users.service.ts      # 服务
│   │   └── users.module.ts        # 模块
│   ├── app.module.ts       # 根模块
│   ├── app.controller.ts   # 根控制器
│   ├── app.service.ts      # 根服务
│   └── main.ts             # 应用入口
├── nest-cli.json           # NestJS CLI 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

## 🔧 技术栈

- **NestJS** - Node.js 企业级框架
- **TypeScript** - 类型安全
- **class-validator** - 数据验证
- **class-transformer** - 数据转换

## 📚 NestJS 核心概念

### 1. 模块（Module）
模块是组织代码的基本单位，使用 `@Module()` 装饰器定义：

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### 2. 控制器（Controller）
控制器处理 HTTP 请求，使用 `@Controller()` 装饰器：

```typescript
@Controller('users')
export class UsersController {
  @Get()
  findAll() { }
  
  @Post()
  create(@Body() dto: CreateUserDto) { }
}
```

### 3. 服务（Service）
服务包含业务逻辑，使用 `@Injectable()` 装饰器：

```typescript
@Injectable()
export class UsersService {
  findAll() { }
  create(dto: CreateUserDto) { }
}
```

### 4. 依赖注入（DI）
NestJS 自动管理依赖关系：

```typescript
constructor(private readonly usersService: UsersService) {}
```

### 5. DTO（Data Transfer Object）
定义数据传输格式和验证规则：

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  
  @IsEmail()
  email: string;
}
```

## 📡 API 接口

### 用户相关接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取所有用户 |
| GET | `/api/users/:id` | 获取单个用户 |
| POST | `/api/users` | 创建用户 |
| PATCH | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### 请求示例

#### 创建用户
```bash
POST http://localhost:3001/api/users
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com"
}
```

#### 获取所有用户
```bash
GET http://localhost:3001/api/users
```

## ⚙️ 配置说明

### CORS 配置
在 `main.ts` 中启用了 CORS，允许前端访问：

```typescript
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
});
```

### 全局验证管道
自动验证请求数据：

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
```

### 全局前缀
所有路由都添加了 `/api` 前缀：

```typescript
app.setGlobalPrefix('api');
```

## 🔍 代码说明

### 数据存储
当前使用内存数组模拟数据库，重启服务后数据会丢失。实际项目中应该：

1. 使用 TypeORM 连接 PostgreSQL/MySQL
2. 使用 Mongoose 连接 MongoDB
3. 使用 Prisma 作为 ORM

### 错误处理
当前是基础实现，实际项目中应该：

1. 创建全局异常过滤器
2. 定义自定义异常类
3. 统一错误响应格式

## 📝 开发建议

1. **数据库集成**：学习使用 TypeORM 或 Prisma
2. **认证授权**：实现 JWT 认证
3. **日志系统**：集成 Winston 或 Pino
4. **测试**：编写单元测试和 E2E 测试
5. **环境配置**：使用 `@nestjs/config` 管理环境变量

## 🛠️ 常用命令

```bash
npm run dev        # 开发模式（热重载）
npm run build      # 构建项目
npm run start      # 启动生产版本
npm run lint       # 代码检查
npm run test       # 运行测试
```

## 📖 学习资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS 中文文档](https://docs.nestjs.cn/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
