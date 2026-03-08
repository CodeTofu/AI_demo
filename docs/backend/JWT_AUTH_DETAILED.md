# 🔐 JWT 认证详解：Strategy 和 Guard

## 📚 文件关系

```
jwt-auth.guard.ts  ← 守卫（门卫）
    ↓ 使用
jwt.strategy.ts    ← 策略（验证规则）
    ↓ 调用
auth.service.ts    ← 服务（获取用户信息）
```

---

## 第一部分：JWT Strategy（验证策略）

### 文件：`jwt.strategy.ts`

**作用：** 定义如何验证 JWT Token

**前端类比：**
```typescript
// 前端：验证函数
function validateToken(token: string) {
  // 1. 解析 Token
  // 2. 验证签名
  // 3. 检查过期
  // 4. 返回用户信息
}

// 后端：JWT Strategy
export class JwtStrategy {
  async validate(payload) {
    // 1. Token 已自动验证（由 Passport 处理）
    // 2. 提取用户信息
    // 3. 返回用户对象
  }
}
```

---

### 代码逐行解析

#### 1. 类定义和继承

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
```

**解释：**
- `@Injectable()` - 标记为可注入的服务
- `extends PassportStrategy(Strategy)` - 继承 Passport 的 JWT 策略
- `Strategy` - Passport 的 JWT 验证策略

**前端类比：**
```typescript
// 前端：继承基类
class MyComponent extends React.Component {
  // ...
}

// 后端：继承策略
class JwtStrategy extends PassportStrategy(Strategy) {
  // ...
}
```

---

#### 2. 构造函数配置

```typescript
constructor(private authService: AuthService) {
  super({
    // 从请求头中提取 Token
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    // 格式：Authorization: Bearer <token>
    
    // 忽略过期时间
    ignoreExpiration: false,
    
    // 密钥
    secretOrKey: 'your-secret-key-change-in-production',
  });
}
```

**配置说明：**

##### `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()`

**作用：** 从请求头中提取 Token

**前端发送：**
```typescript
fetch('/api/users', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    //                ↑
    //        这里提取 Token
  }
})
```

**后端提取：**
```typescript
// 自动从请求头提取
// Authorization: Bearer <token>
// 提取出：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**前端类比：**
```typescript
// 前端：从请求头读取
const token = request.headers.get('Authorization')?.replace('Bearer ', '')

// 后端：自动提取（Passport 处理）
jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
```

---

##### `ignoreExpiration: false`

**作用：** 是否忽略 Token 过期时间

- `false` - 检查过期时间（推荐）
- `true` - 忽略过期时间（不推荐）

**前端类比：**
```typescript
// 前端：检查过期
if (token.exp < Date.now()) {
  // Token 已过期
}

// 后端：自动检查（Passport 处理）
ignoreExpiration: false  // 自动检查过期
```

---

##### `secretOrKey: 'your-secret-key-change-in-production'`

**作用：** JWT 签名密钥（用于验证 Token 是否被篡改）

**前端类比：**
```typescript
// 前端：验证签名
const isValid = jwt.verify(token, secretKey)

// 后端：自动验证（Passport 处理）
secretOrKey: 'your-secret-key'  // 用于验证签名
```

**注意：** 生产环境应该使用环境变量

---

#### 3. validate 方法

```typescript
async validate(payload: any) {
  const user = await this.authService.validateUser(payload.sub);
  if (!user) {
    throw new UnauthorizedException('用户不存在');
  }
  return user;
}
```

**工作流程：**

1. **Token 验证成功**（由 Passport 自动处理）
   - 验证签名
   - 检查过期
   - 解析 payload

2. **调用 validate 方法**
   - `payload` = Token 中的用户信息
   - `payload.sub` = 用户 ID（登录时设置的）

3. **获取用户信息**
   - 调用 `authService.validateUser(payload.sub)`
   - 从数据库查询用户

4. **返回用户信息**
   - 返回的用户信息会附加到 `request.user`
   - 可以在控制器中使用

**前端类比：**
```typescript
// 前端：验证后获取用户信息
async function validateToken(token) {
  const payload = jwt.verify(token, secret)
  const user = await getUserById(payload.userId)
  return user
}

// 后端：自动处理
async validate(payload) {
  const user = await this.authService.validateUser(payload.sub)
  return user  // 自动附加到 request.user
}
```

---

### JWT Strategy 完整流程

```
1. 前端发送请求（带 Token）
   Authorization: Bearer <token>
   ↓
2. Passport 提取 Token
   ExtractJwt.fromAuthHeaderAsBearerToken()
   ↓
3. Passport 验证 Token
   - 验证签名（使用 secretOrKey）
   - 检查过期（ignoreExpiration: false）
   - 解析 payload
   ↓
4. 如果验证成功，调用 validate() 方法
   ↓
5. validate() 方法获取用户信息
   await this.authService.validateUser(payload.sub)
   ↓
6. 返回用户信息
   return user
   ↓
7. 用户信息附加到 request.user
   （可以在控制器中使用）
```

---

## 第二部分：JWT Guard（认证守卫）

### 文件：`jwt-auth.guard.ts`

**作用：** 保护路由，只有 Token 有效才能访问

**前端类比：**
```typescript
// 前端：路由保护组件
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }
  return children
}

// 后端：路由守卫
@UseGuards(JwtAuthGuard)  // 只有 Token 有效才能访问
async findAll() { ... }
```

---

### 代码解析

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**解释：**
- `@Injectable()` - 标记为可注入的服务
- `extends AuthGuard('jwt')` - 继承 Passport 的认证守卫
- `'jwt'` - 使用名为 'jwt' 的策略（对应 `JwtStrategy`）

**前端类比：**
```typescript
// 前端：路由守卫
function ProtectedRoute({ children }) {
  const isAuth = checkAuth()  // 检查认证
  if (!isAuth) {
    redirect('/login')
  }
  return children
}

// 后端：认证守卫
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 自动检查认证（使用 JwtStrategy）
}
```

---

### Guard 的工作流程

```
1. 请求到达受保护的路由
   GET /api/users
   ↓
2. JwtAuthGuard 拦截请求
   @UseGuards(JwtAuthGuard)
   ↓
3. 调用 JwtStrategy 验证 Token
   - 提取 Token
   - 验证签名
   - 检查过期
   ↓
4. 如果验证成功
   - 调用 validate() 方法
   - 获取用户信息
   - 附加到 request.user
   ↓
5. 允许访问路由
   ↓
6. 如果验证失败
   - 返回 401 Unauthorized
   - 阻止访问
```

---

## 第三部分：配合使用

### 完整示例

#### 1. 定义 Strategy（验证规则）

```typescript
// jwt.strategy.ts
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    // 验证 Token 后，获取用户信息
    const user = await this.authService.validateUser(payload.sub)
    return user
  }
}
```

#### 2. 定义 Guard（守卫）

```typescript
// jwt-auth.guard.ts
export class JwtAuthGuard extends AuthGuard('jwt') {}
//                                    ↑
//                              使用 'jwt' 策略
```

#### 3. 使用 Guard（保护路由）

```typescript
// users.controller.ts
@Get()
@UseGuards(JwtAuthGuard)  // 👈 使用守卫保护路由
async findAll() {
  // 这里可以访问 request.user（由 Strategy 提供）
  return this.usersService.findAll()
}
```

---

## 第四部分：实际工作流程

### 场景：前端获取用户列表

#### 1. 前端发送请求

```typescript
fetch('/api/users', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})
```

#### 2. 后端接收请求

```typescript
@Get()
@UseGuards(JwtAuthGuard)  // 👈 守卫拦截
async findAll() {
  return this.usersService.findAll()
}
```

#### 3. Guard 处理

```typescript
// JwtAuthGuard 自动：
// 1. 提取 Token
// 2. 调用 JwtStrategy 验证
```

#### 4. Strategy 验证

```typescript
// JwtStrategy.validate() 自动：
// 1. 验证 Token 签名
// 2. 检查过期时间
// 3. 解析 payload = { sub: 1, email: '...' }
// 4. 调用 authService.validateUser(1)
// 5. 返回用户信息
```

#### 5. 验证成功

```typescript
// 用户信息附加到 request.user
// 允许访问路由
// 执行 findAll() 方法
```

#### 6. 验证失败

```typescript
// 返回 401 Unauthorized
// 阻止访问路由
```

---

## 第五部分：关键理解

### 1. Strategy vs Guard

| 概念 | 作用 | 前端类比 |
|------|------|---------|
| **Strategy** | 定义验证规则（如何验证） | 验证函数 |
| **Guard** | 保护路由（何时验证） | 路由保护组件 |

**关系：**
- Guard 使用 Strategy 来验证
- Guard = 门卫（检查）
- Strategy = 验证规则（如何检查）

---

### 2. 为什么需要两个文件？

**分离职责：**
- `jwt.strategy.ts` - 定义验证逻辑（可复用）
- `jwt-auth.guard.ts` - 保护路由（使用方便）

**前端类比：**
```typescript
// 前端：分离验证逻辑和路由保护
function validateToken(token) { ... }  // 验证逻辑

function ProtectedRoute({ children }) {
  const isValid = validateToken(token)  // 使用验证逻辑
  if (!isValid) return <Navigate to="/login" />
  return children
}

// 后端：分离 Strategy 和 Guard
class JwtStrategy { ... }      // 验证逻辑
class JwtAuthGuard { ... }     // 使用验证逻辑
```

---

### 3. 'jwt' 字符串的作用

```typescript
export class JwtAuthGuard extends AuthGuard('jwt') {}
//                                    ↑
//                              策略名称
```

**作用：**
- `'jwt'` 是策略的名称
- 对应 `JwtStrategy`（在 `auth.module.ts` 中注册）
- Passport 根据名称找到对应的 Strategy

**注册位置：**
```typescript
// auth.module.ts
@Module({
  providers: [AuthService, JwtStrategy],  // 👈 注册 JwtStrategy
  // ...
})
```

---

## 第六部分：完整数据流

```
前端请求
  ↓
GET /api/users
Authorization: Bearer <token>
  ↓
JwtAuthGuard（守卫）
  ↓
JwtStrategy（策略）
  ↓
1. 提取 Token
2. 验证签名
3. 检查过期
4. 解析 payload
  ↓
validate() 方法
  ↓
authService.validateUser(userId)
  ↓
usersService.findOne(userId)
  ↓
prisma.user.findUnique()
  ↓
数据库查询
  ↓
返回用户信息
  ↓
附加到 request.user
  ↓
允许访问路由
  ↓
执行 findAll() 方法
  ↓
返回数据给前端
```

---

## 总结

### JwtStrategy（验证策略）

**作用：**
- 定义如何验证 JWT Token
- 从请求头提取 Token
- 验证签名和过期时间
- 获取用户信息

**关键方法：**
- `validate(payload)` - Token 验证成功后调用

---

### JwtAuthGuard（认证守卫）

**作用：**
- 保护需要认证的路由
- 使用 JwtStrategy 验证 Token
- 验证失败返回 401

**使用方式：**
- `@UseGuards(JwtAuthGuard)` - 装饰器保护路由

---

### 关系

```
Guard（守卫）
    ↓ 使用
Strategy（策略）
    ↓ 调用
Service（服务）
    ↓ 查询
Database（数据库）
```

这就是 JWT 认证的完整机制！
